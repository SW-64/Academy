import { Controller } from '@nestjs/common';
import { HomeworkService } from './homework.service';

@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}
}
