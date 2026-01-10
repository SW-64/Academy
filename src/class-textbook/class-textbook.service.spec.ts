import { Test, TestingModule } from '@nestjs/testing';
import { ClassTextbookService } from './class-textbook.service';

describe('ClassTextbookService', () => {
  let service: ClassTextbookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassTextbookService],
    }).compile();

    service = module.get<ClassTextbookService>(ClassTextbookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
