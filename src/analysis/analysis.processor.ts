import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { APIConnectionTimeoutError } from 'openai';
import { Analysis } from './entities/analysis.entity';
import { AnalysisService } from './analysis.service';
import { S3Service } from '../s3/s3.service';

interface SolveJobData {
  jobId: string;
  images?: string[];
  keys?: string[];
}

@Processor('analysis', { concurrency: 1 })
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    @InjectRepository(Analysis) private readonly analysisRepository: Repository<Analysis>,
    private readonly analysisService: AnalysisService,
    private readonly s3Service: S3Service,
  ) {
    super();
  }

  async process(job: Job<SolveJobData>): Promise<void> {
    const { jobId, images, keys } = job.data;

    const isPdfJob = !!keys;
    const imageCount = isPdfJob ? keys!.length : images!.length;
    this.logger.log(`[${jobId}] 분석 시작 (이미지 ${imageCount}장)`);

    try {
      await this.analysisRepository.update({ jobId }, { status: 'processing' });

      let processableImages: string[];

      if (isPdfJob) {
        const bucket = process.env.R2_BUCKET_NAME!;
        processableImages = await Promise.all(
          keys!.map(async (key) => {
            const buffer = await this.s3Service.getObject({ bucket, key });
            return `data:image/jpeg;base64,${buffer.toString('base64')}`;
          }),
        );
      } else {
        processableImages = images!;
      }

      const result = await this.analysisService.processImages(processableImages);

      await this.analysisRepository.update({ jobId }, { result: JSON.stringify(result), status: 'completed' });
      this.logger.log(`[${jobId}] 분석 완료`);

      if (isPdfJob) {
        const bucket = process.env.R2_BUCKET_NAME!;
        await Promise.all(
          keys!.map((key) => this.s3Service.deleteObject({ bucket, key }).catch(() => {})),
        );
        this.logger.log(`[${jobId}] R2 임시 파일 삭제 완료`);
      }
    } catch (error) {
      if (error instanceof APIConnectionTimeoutError) {
        this.logger.error(`[${jobId}] API 타임아웃 - 재시도 없이 실패 처리`);
        await this.analysisRepository.update({ jobId }, { status: 'failed' });
        throw new UnrecoverableError(`[${jobId}] API 타임아웃`);
      }

      this.logger.error(`[${jobId}] 처리 중 오류 발생`, error);
      await this.analysisRepository.update({ jobId }, { status: 'failed' });
      throw error;
    }
  }
}
