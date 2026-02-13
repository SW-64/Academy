import { Test, TestingModule } from '@nestjs/testing';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';

describe('ExamController', () => {
  let controller: ExamController;

  beforeEach(async () => {
    const examServiceMock = {
      createExam: jest.fn(),
      findAllExams: jest.fn(),
      findExam: jest.fn(),
      updateExam: jest.fn(),
      deleteExam: jest.fn(),
      createExamAverage: jest.fn(),
      getExamWrongAnswers: jest.fn(),
      updateExamWrongAnswers: jest.fn(),
      calculateExamErrorRates: jest.fn(),
      getExamErrorRates: jest.fn(),
      calculateExamRankings: jest.fn(),
      getExamRankings: jest.fn(),
      createHighExamAverage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamController],
      providers: [
        {
          provide: ExamService,
          useValue: examServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ExamController>(ExamController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
