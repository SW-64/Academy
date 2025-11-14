import { Module } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ParentsController } from './parents.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { Student } from '../students/entities/student.entity';
import { ParentsRepository } from './parents.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Parent, Student])],
  controllers: [ParentsController],
  providers: [ParentsService, ParentsRepository],
})
export class ParentsModule {}
