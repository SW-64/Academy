import { Controller } from '@nestjs/common';
import { ClassTextbookService } from './class-textbook.service';

@Controller('class-textbook')
export class ClassTextbookController {
  constructor(private readonly classTextbookService: ClassTextbookService) {}
}
