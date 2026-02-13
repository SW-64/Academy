import { Test, TestingModule } from '@nestjs/testing';
import { HomeworkController } from './homework.controller';
import { HomeworkService } from './homework.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClassAccessGuard } from '../auth/guards/class-acces.guard';
import { CanActivate } from '@nestjs/common';

describe('HomeworkController', () => {
  let controller: HomeworkController;

  beforeEach(async () => {
    const homeworkServiceMock = {
      getHomeworkProgress: jest.fn(),
      updateHomeworkProgress: jest.fn(),
      deleteHomeworkProgress: jest.fn(),
      getMyHomeworkProgress: jest.fn(),
      getMyChildHomeworkProgress: jest.fn(),
    };
    const allowAllGuard: CanActivate = { canActivate: () => true };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeworkController],
      providers: [
        {
          provide: HomeworkService,
          useValue: homeworkServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowAllGuard)
      .overrideGuard(ClassAccessGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<HomeworkController>(HomeworkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
