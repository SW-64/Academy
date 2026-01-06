import { Controller } from '@nestjs/common';
import { TextbooksService } from './textbooks.service';

@Controller('textbooks')
export class TextbooksController {
  constructor(private readonly textbooksService: TextbooksService) {}
}
