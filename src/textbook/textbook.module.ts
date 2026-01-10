import { Module } from '@nestjs/common';
import { TextbookService } from './textbook.service';
import { TextbookController } from './textbook.controller';

@Module({
  controllers: [TextbookController],
  providers: [TextbookService],
})
export class TextbookModule {}
