import { Controller } from '@nestjs/common';
import { ClassTextbooksService } from './class-textbooks.service';

@Controller('class-textbooks')
export class ClassTextbooksController {
  constructor(private readonly classTextbooksService: ClassTextbooksService) {}
}
