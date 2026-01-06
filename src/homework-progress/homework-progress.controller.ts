import { Controller } from '@nestjs/common';
import { HomeworkProgressService } from './homework-progress.service';

@Controller('homework-progress')
export class HomeworkProgressController {
  constructor(private readonly homeworkProgressService: HomeworkProgressService) {}
}
