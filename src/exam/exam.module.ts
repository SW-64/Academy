import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from '../admin/entities/admin.entity';
import { Exam } from './entities/exam.entity';
import { Grade } from '../grades/entities/grade.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { ExamDetail } from './entities/exam-detail.entity';
import { Student } from '../students/entities/student.entity';
import { GradeWrongAnswer } from '../grades/entities/grade-wrong-answer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      Exam,
      Grade,
      ActionLog,
      ExamDetail,
      Student,
      GradeWrongAnswer,
    ]),
  ],
  controllers: [ExamController],
  providers: [ExamService],
})
export class ExamModule {}
