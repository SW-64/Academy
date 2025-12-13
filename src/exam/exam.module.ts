import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from '../admin/entities/admin.entity';
import { Exam } from './entities/exam.entity';
import { Grade } from '../grades/entities/grade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Exam, Grade])],
  controllers: [ExamController],
  providers: [ExamService],
})
export class ExamModule {}
