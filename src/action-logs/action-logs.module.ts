import { Module } from '@nestjs/common';
import { ActionLogsService } from './action-logs.service';
import { ActionLogsController } from './action-logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionLog } from './entities/action-logs.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActionLog])],
  controllers: [ActionLogsController],
  providers: [ActionLogsService],
})
export class ActionLogsModule {}
