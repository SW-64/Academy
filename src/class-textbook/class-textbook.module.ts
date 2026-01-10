import { Module } from '@nestjs/common';
import { ClassTextbookService } from './class-textbook.service';
import { ClassTextbookController } from './class-textbook.controller';

@Module({
  controllers: [ClassTextbookController],
  providers: [ClassTextbookService],
})
export class ClassTextbookModule {}
