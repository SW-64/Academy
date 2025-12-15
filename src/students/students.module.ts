import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Student } from './entities/student.entity';
import { Grade } from '../grades/entities/grade.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Grade, User])],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
