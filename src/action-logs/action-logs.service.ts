import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionLog } from './entities/action-logs.entity';
import { CreateLogDto } from './dto/create-log.dto';

@Injectable()
export class ActionLogsService {
  constructor(
    @InjectRepository(ActionLog)
    private readonly actionLogsRepository: Repository<ActionLog>,
  ) {}

  async createLog(dto: CreateLogDto): Promise<void> {
    await this.actionLogsRepository.save(dto);
  }

  async findAllLogs(): Promise<ActionLog[]> {
    return this.actionLogsRepository.find({
      order: { createdAt: 'DESC' },
      take: 100, // 최근 100개 로그만 가져오기 (원하면 필터 기능 추가 가능)
    });
  }

  async findLogsByActor(actorId: number): Promise<ActionLog[]> {
    return this.actionLogsRepository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
    });
  }
}
