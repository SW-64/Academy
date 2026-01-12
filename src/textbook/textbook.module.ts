import { Module } from '@nestjs/common';
import { TextbookService } from './textbook.service';
import { TextbookController } from './textbook.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './../admin/entities/admin.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { Textbook } from './entities/textbook.entity';
import { TextbookChapter } from './entities/textbook-chapter.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, ActionLog, Textbook, TextbookChapter]),
  ],

  controllers: [TextbookController],
  providers: [TextbookService],
})
export class TextbookModule {}
