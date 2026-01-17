import { Module } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassTextbook } from '../class-textbook/entities/class-textbook.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { TextbookChapter } from '../textbook/entities/textbook-chapter.entity';
import { Progress } from './entities/progress.entity';
import { ProgressChapter } from './entities/progress-chapter.entity';
import { Parent } from './../parents/entities/parent.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassTextbook,
      StudentClass,
      Student,
      User,
      TextbookChapter,
      Progress,
      ProgressChapter,
      TextbookChapter,
      Parent,
    ]),
  ],
  controllers: [HomeworkController],
  providers: [HomeworkService],
})
export class HomeworkModule {}
