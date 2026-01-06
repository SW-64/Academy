import { Module } from '@nestjs/common';
import { ClassTextbooksService } from './class-textbooks.service';
import { ClassTextbooksController } from './class-textbooks.controller';

@Module({
  controllers: [ClassTextbooksController],
  providers: [ClassTextbooksService],
})
export class ClassTextbooksModule {}
