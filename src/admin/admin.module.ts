import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { Material } from './entities/material.entity';
import { Notice } from './entities/notice.entity';
import { Video } from './entities/video.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Material, Notice, Video])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
