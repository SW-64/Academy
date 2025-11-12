import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Grade } from './entities/grade.entity';
import { Repository } from 'typeorm';

@Injectable()
export class GradeRepository {
  constructor(
    @InjectRepository(Grade)
    private readonly repository: Repository<Grade>,
  ) {}
}
