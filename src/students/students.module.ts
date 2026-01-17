import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Student } from './entities/student.entity';
import { Grade } from '../grades/entities/grade.entity';
import { User } from '../users/entities/user.entity';
import { Parent } from '../parents/entities/parent.entity';
import { MaterialsModule } from '../materials/materials.module';
import { StudentClass } from '../student-class/entities/student-class.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Grade, User, Parent, StudentClass]),
    MaterialsModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
