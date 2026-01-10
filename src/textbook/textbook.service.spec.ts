import { Test, TestingModule } from '@nestjs/testing';
import { TextbookService } from './textbook.service';

describe('TextbookService', () => {
  let service: TextbookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextbookService],
    }).compile();

    service = module.get<TextbookService>(TextbookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
