import { Module } from '@nestjs/common';
import { MaterialService } from './materials.service';
import { MaterialController } from './materials.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './entities/material.entity';
import { ClassMaterial } from './entities/class-material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material, ClassMaterial])],
  controllers: [MaterialController],
  providers: [MaterialService],
})
export class MaterialModule {}
