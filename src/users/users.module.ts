import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { Parent } from '../parents/entities/parent.entity';
import { RefreshToken } from '../auth/entities/refreshtoken.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Student, Parent, RefreshToken, ActionLog]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
