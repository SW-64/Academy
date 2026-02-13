import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClassAccessGuard } from '../auth/guards/class-acces.guard';

describe('GradesController', () => {
  let controller: GradesController;

  beforeEach(async () => {
    const gradesServiceMock = {
      getStudentGrade: jest.fn(),
      getStudentGradeByParent: jest.fn(),
      getMyRank: jest.fn(),
      getMyStudentRank: jest.fn(),
    };

    const allowAllGuard: CanActivate = { canActivate: () => true };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GradesController],
      providers: [{ provide: GradesService, useValue: gradesServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowAllGuard)
      .overrideGuard(ClassAccessGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<GradesController>(GradesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
