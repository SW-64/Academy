import { Controller } from '@nestjs/common';
import { StudentClassService } from './student-class.service';

@Controller('student-class')
export class StudentClassController {
  constructor(private readonly studentClassService: StudentClassService) {}
}
