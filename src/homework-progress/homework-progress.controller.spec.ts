import { Test, TestingModule } from '@nestjs/testing';
import { HomeworkProgressController } from './homework-progress.controller';
import { HomeworkProgressService } from './homework-progress.service';

describe('HomeworkProgressController', () => {
  let controller: HomeworkProgressController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeworkProgressController],
      providers: [HomeworkProgressService],
    }).compile();

    controller = module.get<HomeworkProgressController>(HomeworkProgressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
