import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { StudentsRepository } from './students.repository';
import { Grade } from './entities/grade.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Grade])],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsRepository],
})
export class StudentsModule {}
