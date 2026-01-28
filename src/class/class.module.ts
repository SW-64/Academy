import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { ClassTextbook } from '../class-textbook/entities/class-textbook.entity';
import { Student } from '../students/entities/student.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { Parent } from '../parents/entities/parent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Class,
      ClassTextbook,
      Student,
      ActionLog,
      StudentClass,
      Parent,
    ]),
  ],
  controllers: [ClassController],
  providers: [ClassService],
})
export class ClassModule {}
