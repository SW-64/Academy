import { Test, TestingModule } from '@nestjs/testing';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';

import { CanActivate } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClassAccessGuard } from '../auth/guards/class-acces.guard';

describe('ClassController', () => {
  let controller: ClassController;

  beforeEach(async () => {
    const classServiceMock = {
      createClass: jest.fn(),
      getAllStudentsOfClass: jest.fn(),
      getAllClasses: jest.fn(),
      updateClass: jest.fn(),
      deleteClass: jest.fn(),
      getAllTextbooksOfClass: jest.fn(),
    };

    const allowAllGuard: CanActivate = { canActivate: () => true };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassController],
      providers: [
        {
          provide: ClassService,
          useValue: classServiceMock,
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

    controller = module.get<ClassController>(ClassController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
