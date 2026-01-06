import { Test, TestingModule } from '@nestjs/testing';
import { TextbooksService } from './textbooks.service';

describe('TextbooksService', () => {
  let service: TextbooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextbooksService],
    }).compile();

    service = module.get<TextbooksService>(TextbooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
