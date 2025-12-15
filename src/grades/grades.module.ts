import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from '../admin/entities/admin.entity';
import { Exam } from '../exam/entities/exam.entity';
import { Grade } from '../grades/entities/grade.entity';
import { Student } from '../students/entities/student.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Admin, Exam, Grade, Student])],
  controllers: [GradesController],
  providers: [GradesService],
})
export class GradesModule {}
