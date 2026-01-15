import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { Video } from './entities/video.entity';

import { User } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { Parent } from './../parents/entities/parent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Video, User, Student, Parent])],
  controllers: [],
  providers: [],
})
export class AdminModule {}
