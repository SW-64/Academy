import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from '../admin/entities/admin.entity';
import { Exam } from '../exam/entities/exam.entity';
import { Grade } from '../grades/entities/grade.entity';
import { Student } from '../students/entities/student.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { Parent } from '../parents/entities/parent.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { User } from '../users/entities/user.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      Exam,
      Grade,
      Student,
      ActionLog,
      Parent,
      StudentClass,
      User,
    ]),
  ],
  controllers: [GradesController],
  providers: [GradesService],
})
export class GradesModule {}
