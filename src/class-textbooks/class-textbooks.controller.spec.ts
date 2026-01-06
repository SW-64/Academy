import { Test, TestingModule } from '@nestjs/testing';
import { ClassTextbooksController } from './class-textbooks.controller';
import { ClassTextbooksService } from './class-textbooks.service';

describe('ClassTextbooksController', () => {
  let controller: ClassTextbooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassTextbooksController],
      providers: [ClassTextbooksService],
    }).compile();

    controller = module.get<ClassTextbooksController>(ClassTextbooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
