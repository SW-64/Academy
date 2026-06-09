import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { Repository, LessThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import OpenAI, { RateLimitError, toFile } from 'openai';
import { Analysis } from './entities/analysis.entity';

export interface ProblemResult {
  problem_number: number;
  explanation: string;
  customPrompt: string | null;
  updatedAt: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ImageResult {
  image_index: number;
  detected_problems: number[];
  problems: ProblemResult[];
  detection_usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface SolveResponse {
  results: ImageResult[];
  total_input_tokens: number;
  total_output_tokens: number;
}

const KIMI_CONCURRENCY = 3;
const KIMI_RPM = 20;

const DETECT_PROMPT = `이 시험지에 있는 문제 번호를 JSON 배열로만 반환해줘. 예시: [11, 12, 13]`;

const SOLVE_PROMPT_BASE = `## 지침
- 대상: 고등학교 수험생 (수능 기준)
- 각 풀이 단계마다 왜 이 방법을 쓰는지 이유를 한 문장으로 먼저 써줘
- 수식은 LaTeX로 작성
- 부호 분석은 반드시 부호표 사용
- 통분, 인수분해 등 중간 계산 절대 생략하지 말 것
- 보기 문제는 각 보기마다 참/거짓 판정과 근거를 표로 정리
- 결론의 근거를 명확히 연결할 것

## 풀이 구조
1. 문제 요약 (핵심 조건만 간결하게)
2. 핵심 공식/개념 명시
3. 단계별 풀이
4. 최종 답 강조`;

class Semaphore {
  private readonly queue: (() => void)[] = [];
  private count: number;

  constructor(max: number) {
    this.count = max;
  }

  private acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.queue.push(resolve));
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.count++;
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

class RpmLimiter {
  private timestamps: number[] = [];

  constructor(private readonly rpm: number) {}

  async throttle(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => t > now - 60_000);

    if (this.timestamps.length >= this.rpm) {
      const waitMs = this.timestamps[0] + 60_000 - now + 100;
      await new Promise((r) => setTimeout(r, waitMs));
      return this.throttle();
    }

    this.timestamps.push(Date.now());
  }
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly client: OpenAI;
  private readonly semaphore = new Semaphore(KIMI_CONCURRENCY);
  private readonly rpmLimiter = new RpmLimiter(KIMI_RPM);

  constructor(
    @InjectQueue('analysis') private readonly analysisQueue: Queue,
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
  ) {
    this.client = new OpenAI({
      baseURL: 'https://api.moonshot.ai/v1',
      apiKey: process.env.MOONSHOT_API_KEY,
      timeout: 10 * 60 * 1000,
      maxRetries: 0,
    });
  }

  async uploadFileToMoonshot(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    const file = await toFile(buffer, filename, { type: mimetype });
    const uploaded = await this.client.files.create({ file, purpose: 'image' as any });
    return uploaded.id;
  }

  async enqueueFromFileIds(jobId: string, fileIds: string[]): Promise<{ jobId: string }> {
    await this.analysisRepository.save(
      this.analysisRepository.create({
        jobId,
        originalFileName: '',
        status: 'pending',
        images: JSON.stringify(fileIds),
      }),
    );

    await this.analysisQueue.add(
      'solve',
      { jobId, fileIds },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    return { jobId };
  }

  async enqueue(files: Express.Multer.File[]): Promise<{ jobId: string }> {
    const jobId = uuidv4();

    const fileIds = await Promise.all(
      files.map((f) => this.uploadFileToMoonshot(f.buffer, f.originalname, f.mimetype)),
    );

    await this.analysisRepository.save(
      this.analysisRepository.create({
        jobId,
        originalFileName: '',
        status: 'pending',
        images: JSON.stringify(fileIds),
      }),
    );

    await this.analysisQueue.add(
      'solve',
      { jobId, fileIds },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    return { jobId };
  }

  async getStatus(jobId: string): Promise<{
    jobId: string;
    status: string;
    result: SolveResponse | null;
  }> {
    const record = await this.analysisRepository.findOne({ where: { jobId } });
    if (!record) throw new NotFoundException(`jobId ${jobId}를 찾을 수 없습니다.`);

    return {
      jobId,
      status: record.status,
      result:
        record.status === 'completed' && record.result
          ? (JSON.parse(record.result) as SolveResponse)
          : null,
    };
  }

  async retryProblem(
    jobId: string,
    problemNum: number,
    customPrompt?: string,
  ): Promise<ProblemResult> {
    const record = await this.analysisRepository.findOne({ where: { jobId } });
    if (!record) throw new NotFoundException(`jobId ${jobId}를 찾을 수 없습니다.`);
    if (record.status !== 'completed' || !record.result)
      throw new BadRequestException('완료된 분석 결과가 없습니다.');
    if (!record.images) throw new BadRequestException('저장된 이미지가 없습니다.');

    const result = JSON.parse(record.result) as SolveResponse;
    const images = JSON.parse(record.images) as string[];

    let targetImage: string | undefined;
    let targetImageResult: ImageResult | undefined;

    for (const imageResult of result.results) {
      if (imageResult.detected_problems.includes(problemNum)) {
        targetImage = images[imageResult.image_index];
        targetImageResult = imageResult;
        break;
      }
    }

    if (!targetImage || !targetImageResult)
      throw new NotFoundException(`${problemNum}번 문제를 찾을 수 없습니다.`);

    const updated = await this.callKimiSolve(`ms://${targetImage}`, problemNum, 0, customPrompt);

    const problemIndex = targetImageResult.problems.findIndex(
      (p) => p.problem_number === problemNum,
    );
    if (problemIndex !== -1) {
      targetImageResult.problems[problemIndex] = updated;
    } else {
      targetImageResult.problems.push(updated);
    }

    await this.analysisRepository.update({ jobId }, { result: JSON.stringify(result) });

    return updated;
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupMoonshotFiles(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.analysisRepository.find({
      where: { status: 'completed', createdAt: LessThan(thirtyDaysAgo) },
    });

    const targets = records.filter((r) => r.images !== null);
    if (targets.length === 0) {
      this.logger.log('[cleanup] 삭제 대상 없음');
      return;
    }

    this.logger.log(`[cleanup] 삭제 대상 ${targets.length}건`);

    for (const record of targets) {
      const fileIds = JSON.parse(record.images!) as string[];
      const results = await Promise.allSettled(fileIds.map((id) => this.client.files.delete(id)));

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        this.logger.warn(`[cleanup] jobId=${record.jobId} 파일 ${failed.length}개 삭제 실패`);
      }

      await this.analysisRepository.update({ jobId: record.jobId }, { images: null });
      this.logger.log(`[cleanup] jobId=${record.jobId} 완료`);
    }
  }

  async processImages(images: string[]): Promise<SolveResponse> {
    const results = await Promise.all(
      images.map((image, i) => this.processImage(image, i)),
    );

    return {
      results,
      total_input_tokens: results.reduce(
        (sum, r) =>
          sum +
          r.detection_usage.input_tokens +
          r.problems.reduce((s, p) => s + p.usage.input_tokens, 0),
        0,
      ),
      total_output_tokens: results.reduce(
        (sum, r) =>
          sum +
          r.detection_usage.output_tokens +
          r.problems.reduce((s, p) => s + p.usage.output_tokens, 0),
        0,
      ),
    };
  }

  private async processImage(image: string, index: number): Promise<ImageResult> {
    this.logger.log(`[image:${index}] 감지 시작`);
    const { problemNumbers, usage: detectionUsage } = await this.callKimiDetect(image, index);
    this.logger.log(`[image:${index}] 감지 완료 → 문제 번호: ${JSON.stringify(problemNumbers)}`);

    const problems = await Promise.all(
      problemNumbers.map((n) => this.callKimiSolve(image, n)),
    );

    return {
      image_index: index,
      detected_problems: problemNumbers,
      problems,
      detection_usage: detectionUsage,
    };
  }

  private async withKimiLimits<T>(fn: () => Promise<T>): Promise<T> {
    return this.semaphore.run(async () => {
      await this.rpmLimiter.throttle();
      return fn();
    });
  }

  private async callKimiDetect(
    image: string,
    imageIndex: number,
    attempt = 0,
    emptyAttempt = 0,
  ): Promise<{ problemNumbers: number[]; usage: { input_tokens: number; output_tokens: number } }> {
    try {
      return await this.withKimiLimits(async () => {
        const params = {
          model: 'kimi-k2.6',
          max_completion_tokens: 256,
          messages: [
            {
              role: 'user' as const,
              content: [
                {
                  type: 'image_url' as const,
                  image_url: { url: image },
                },
                { type: 'text' as const, text: DETECT_PROMPT },
              ],
            },
          ],
        };

        const response = await (
          this.client.chat.completions.create as (p: unknown) => Promise<OpenAI.Chat.ChatCompletion>
        )(params);

        const text = response.choices[0].message.content ?? '[]';
        const match = text.match(/\[[\d,\s]+\]/);
        const problemNumbers: number[] = match ? (JSON.parse(match[0]) as number[]) : [];

        if (problemNumbers.length === 0 && emptyAttempt < 3) {
          this.logger.warn(`[image:${imageIndex}] 빈 배열 반환 - 재시도 (${emptyAttempt + 1}/3)`);
          await new Promise((r) => setTimeout(r, 500));
          return this.callKimiDetect(image, imageIndex, attempt, emptyAttempt + 1);
        }

        if (problemNumbers.length === 0) {
          this.logger.warn(`[image:${imageIndex}] 3번 재시도 후에도 문제 미감지`);
        }

        return {
          problemNumbers,
          usage: {
            input_tokens: response.usage?.prompt_tokens ?? 0,
            output_tokens: response.usage?.completion_tokens ?? 0,
          },
        };
      });
    } catch (error) {
      if (error instanceof RateLimitError && attempt < 5) {
        const retryAfter = parseInt(error.headers?.['retry-after'] ?? '2', 10);
        await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
        return this.callKimiDetect(image, imageIndex, attempt + 1, emptyAttempt);
      }
      throw error;
    }
  }

  private async callKimiSolve(
    image: string,
    problemNumber: number,
    attempt = 0,
    customPrompt?: string,
  ): Promise<ProblemResult> {
    try {
      return await this.withKimiLimits(async () => {
        this.logger.log(`${problemNumber}번 해설 시작`);
        let prompt = `${problemNumber}번 문제에 대해 해설해줘.`;
        if (customPrompt) {
          prompt += `\n\n## 추가 요청\n${customPrompt}`;
        }

        const params = {
          model: 'kimi-k2.6',
          max_completion_tokens: 32000,
          thinking: { type: 'enabled' },
          stream: true,
          stream_options: { include_usage: true },
          messages: [
            {
              role: 'system' as const,
              content: SOLVE_PROMPT_BASE,
            },
            {
              role: 'user' as const,
              content: [
                {
                  type: 'image_url' as const,
                  image_url: { url: image },
                },
                { type: 'text' as const, text: prompt },
              ],
            },
          ],
        };

        const stream = await (
          this.client.chat.completions.create as (
            p: unknown,
          ) => Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>>
        )(params);

        let content = '';
        let inputTokens = 0;
        let outputTokens = 0;

        for await (const chunk of stream) {
          content += chunk.choices[0]?.delta?.content ?? '';
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0;
            outputTokens = chunk.usage.completion_tokens ?? 0;
          }
        }

        const result = {
          problem_number: problemNumber,
          explanation: content,
          customPrompt: customPrompt ?? null,
          updatedAt: new Date().toISOString(),
          usage: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
          },
        };
        this.logger.log(`${problemNumber}번 해설 완료`);
        return result;
      });
    } catch (error) {
      if (error instanceof RateLimitError && attempt < 5) {
        const retryAfter = parseInt(error.headers?.['retry-after'] ?? '2', 10);
        await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
        return this.callKimiSolve(image, problemNumber, attempt + 1, customPrompt);
      }
      throw error;
    }
  }
}
