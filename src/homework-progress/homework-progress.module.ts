import { Module } from '@nestjs/common';
import { HomeworkProgressService } from './homework-progress.service';
import { HomeworkProgressController } from './homework-progress.controller';

@Module({
  controllers: [HomeworkProgressController],
  providers: [HomeworkProgressService],
})
export class HomeworkProgressModule {}
