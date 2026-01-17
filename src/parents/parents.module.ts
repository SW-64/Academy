import { Module } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parent, Student, User, StudentClass])],
  controllers: [ParentsController],
  providers: [ParentsService],
})
export class ParentsModule {}
