import { Module } from '@nestjs/common';
import { NoticesService } from './notices.service';
import { NoticesController } from './notices.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from '../admin/entities/admin.entity';
import { Notice } from './entities/notice.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { ClassNotice } from './entities/class-notice.entity';
import { Class } from './../class/entities/class.entity';
import { Student } from './../students/entities/student.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      Notice,
      ActionLog,
      ClassNotice,
      Class,
      Student,
      StudentClass,
    ]),
  ],

  controllers: [NoticesController],
  providers: [NoticesService],
})
export class NoticesModule {}
