import { Test, TestingModule } from '@nestjs/testing';
import { ClassTextbooksService } from './class-textbooks.service';

describe('ClassTextbooksService', () => {
  let service: ClassTextbooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassTextbooksService],
    }).compile();

    service = module.get<ClassTextbooksService>(ClassTextbooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
