import { Test, TestingModule } from '@nestjs/testing';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';

describe('ParentsController', () => {
  let controller: ParentsController;

  beforeEach(async () => {
    const parentsServiceMock = {
      getMyStudents: jest.fn(),
      findAllParents: jest.fn(),
      findOneParent: jest.fn(),
      getMyChildClasses: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParentsController],
      providers: [
        {
          provide: ParentsService,
          useValue: parentsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ParentsController>(ParentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
