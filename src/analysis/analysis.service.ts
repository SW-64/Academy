import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Analysis } from './entities/analysis.entity';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectQueue('analysis') private readonly analysisQueue: Queue,
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
  ) {}

  async enqueueAnalysis(filePath: string, originalFileName: string): Promise<string> {
    const jobId = uuidv4();

    await this.analysisRepository.save(
      this.analysisRepository.create({
        jobId,
        originalFileName,
        status: 'pending',
      }),
    );

    await this.analysisQueue.add(
      'analyze-pdf',
      { jobId, filePath, originalFileName },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    return jobId;
  }

  async getStatus(jobId: string): Promise<{
    jobId: string;
    status: string;
    progress: { step: string; percent: number };
    result: string | null;
  }> {
    const job = await this.analysisQueue.getJob(jobId);
    const record = await this.analysisRepository.findOne({ where: { jobId } });

    if (!record) {
      throw new NotFoundException(`jobId ${jobId}를 찾을 수 없습니다.`);
    }

    let status: string;
    let progress: { step: string; percent: number };

    if (!job) {
      // removeOnComplete 로 큐에서 제거된 경우 DB 상태 기준
      status = record.status;
      progress =
        record.status === 'completed'
          ? { step: '완료', percent: 100 }
          : { step: '실패', percent: 0 };
    } else {
      const jobState = await job.getState();
      status = jobState;

      const raw = job.progress as unknown;
      if (raw && typeof raw === 'object' && 'step' in (raw as object)) {
        progress = raw as { step: string; percent: number };
      } else {
        progress = { step: '대기 중', percent: 0 };
      }
    }

    return {
      jobId,
      status,
      progress,
      result: record.status === 'completed' ? record.result : null,
    };
  }
}
