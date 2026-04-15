import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import { Analysis } from './entities/analysis.entity';

interface AnalysisJobData {
  jobId: string;
  filePath: string;
  originalFileName: string;
}

@Processor('analysis', { concurrency: 1 })
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisProcessor.name);
  private readonly anthropic: Anthropic;

  constructor(
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
  ) {
    super();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async process(job: Job<AnalysisJobData>): Promise<void> {
    const { jobId, filePath, originalFileName } = job.data;
    this.logger.log(`[${jobId}] 분석 시작: ${originalFileName}`);

    try {
      // 1단계: PDF 파일 읽기 및 base64 변환
      await job.updateProgress({
        step: 'PDF 파일 읽기 및 base64 변환 중',
        percent: 20,
      });
      this.logger.log(`[${jobId}] 1단계: PDF 읽기`);

      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      // 2단계: Claude API 호출
      await job.updateProgress({ step: 'Claude API 호출 중', percent: 50 });
      this.logger.log(`[${jobId}] 2단계: Claude API 호출`);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Data,
                },
              } as unknown as Anthropic.TextBlockParam,
              {
                type: 'text',
                text: '이 수학 시험지의 각 문제를 단계별로 상세하게 해설해줘. 그래프, 표, 수식이 있으면 그것도 포함해서 설명해줘.',
              },
            ],
          },
        ],
      });

      const analysisResult = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as Anthropic.TextBlock).text)
        .join('\n');

      // 3단계: RDS에 결과 저장
      await job.updateProgress({ step: 'RDS에 결과 저장 중', percent: 90 });
      this.logger.log(`[${jobId}] 3단계: DB 저장`);

      await this.analysisRepository.update(
        { jobId },
        { result: analysisResult, status: 'completed' },
      );

      // 4단계: 임시 파일 삭제
      await job.updateProgress({ step: '완료', percent: 100 });
      this.logger.log(`[${jobId}] 4단계: 임시 파일 삭제`);

      fs.unlinkSync(filePath);
      this.logger.log(`[${jobId}] 분석 완료`);
    } catch (error) {
      this.logger.error(`[${jobId}] 처리 중 오류 발생`, error);

      // 임시 파일 정리 시도 (파일이 존재할 경우)
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          this.logger.warn(`[${jobId}] 임시 파일 삭제 실패: ${filePath}`);
        }
      }

      await this.analysisRepository.update({ jobId }, { status: 'failed' });
      throw error;
    }
  }
}
