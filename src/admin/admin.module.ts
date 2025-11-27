import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { Material } from './entities/material.entity';
import { Notice } from './entities/notice.entity';
import { Video } from './entities/video.entity';
import { Exam } from './entities/exam.entity';
import { User } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { Parent } from './../parents/entities/parent.entity';
import { Grade } from './entities/grade.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      Material,
      Notice,
      Video,
      Exam,
      User,
      Student,
      Parent,
      Grade,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
