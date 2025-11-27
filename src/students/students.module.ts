import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Grade } from '../admin/entities/grade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Grade])],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
