import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { APIConnectionTimeoutError } from 'openai';
import { Analysis } from './entities/analysis.entity';
import { AnalysisService } from './analysis.service';

interface SolveJobData {
  jobId: string;
  fileIds: string[];
}

@Processor('analysis', { concurrency: 1 })
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    @InjectRepository(Analysis) private readonly analysisRepository: Repository<Analysis>,
    private readonly analysisService: AnalysisService,
  ) {
    super();
  }

  async process(job: Job<SolveJobData>): Promise<void> {
    const { jobId, fileIds } = job.data;

    this.logger.log(`[${jobId}] 분석 시작 (이미지 ${fileIds.length}장)`);

    try {
      await this.analysisRepository.update({ jobId }, { status: 'processing' });

      const images = fileIds.map((id) => `ms://${id}`);
      const result = await this.analysisService.processImages(images);

      await this.analysisRepository.update({ jobId }, { result: JSON.stringify(result), status: 'completed' });
      this.logger.log(`[${jobId}] 분석 완료`);
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
