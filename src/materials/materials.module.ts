import { Module } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './entities/material.entity';
import { ClassMaterial } from './entities/class-material.entity';
import { Class } from '../class/entities/class.entity';
import { S3Module } from '../s3/s3.module';
import { Student } from '../students/entities/student.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Material,
      ClassMaterial,
      Class,
      Student,
      StudentClass,
    ]),
    S3Module,
  ],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
