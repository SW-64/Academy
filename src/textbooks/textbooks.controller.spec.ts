import { Test, TestingModule } from '@nestjs/testing';
import { TextbooksController } from './textbooks.controller';
import { TextbooksService } from './textbooks.service';

describe('TextbooksController', () => {
  let controller: TextbooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TextbooksController],
      providers: [TextbooksService],
    }).compile();

    controller = module.get<TextbooksController>(TextbooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
