import { Test, TestingModule } from '@nestjs/testing';
import { ClassTextbookController } from './class-textbook.controller';
import { ClassTextbookService } from './class-textbook.service';

describe('ClassTextbookController', () => {
  let controller: ClassTextbookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassTextbookController],
      providers: [ClassTextbookService],
    }).compile();

    controller = module.get<ClassTextbookController>(ClassTextbookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
