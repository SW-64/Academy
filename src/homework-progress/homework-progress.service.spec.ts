import { Test, TestingModule } from '@nestjs/testing';
import { HomeworkProgressService } from './homework-progress.service';

describe('HomeworkProgressService', () => {
  let service: HomeworkProgressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HomeworkProgressService],
    }).compile();

    service = module.get<HomeworkProgressService>(HomeworkProgressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
