import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Grade } from './entities/grade.entity';
import { Parent } from '../parents/entities/parent.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Grade, Parent]), RedisModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
