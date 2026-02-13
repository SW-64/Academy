import { Test, TestingModule } from '@nestjs/testing';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';

describe('TextbookController', () => {
  let controller: TextbookController;

  beforeEach(async () => {
    const textbookServiceMock = {
      createTextbook: jest.fn(),
      getAllTextbooks: jest.fn(),
      getOneTextbook: jest.fn(),
      updateTextbook: jest.fn(),
      deleteTextbook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TextbookController],
      providers: [
        {
          provide: TextbookService,
          useValue: textbookServiceMock,
        },
      ],
    }).compile();

    controller = module.get<TextbookController>(TextbookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
