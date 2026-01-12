import { Module } from '@nestjs/common';
import { NoticesService } from './notices.service';
import { NoticesController } from './notices.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admin } from '../admin/entities/admin.entity';
import { Notice } from './entities/notice.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Notice, ActionLog])],
  controllers: [NoticesController],
  providers: [NoticesService],
})
export class NoticesModule {}
