import { Test, TestingModule } from '@nestjs/testing';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';

describe('TextbookController', () => {
  let controller: TextbookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TextbookController],
      providers: [TextbookService],
    }).compile();

    controller = module.get<TextbookController>(TextbookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
