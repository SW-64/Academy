import { Test, TestingModule } from '@nestjs/testing';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import { RolesGuard } from './../auth/guards/roles.guard';
import { StudentOrParentOwnsStudentGuard } from './../auth/guards/student-or-parent-owns-student.guard';
import { CanActivate } from '@nestjs/common';
import { MaterialsService } from '../materials/materials.service';

describe('StudentsController', () => {
  let controller: StudentsController;

  beforeEach(async () => {
    const studentsServiceMock = {
      getAllGrades: jest.fn(),
      getOneGrade: jest.fn(),
      getCurrentGrades: jest.fn(),
      findAllStudents: jest.fn(),
      findOneStudent: jest.fn(),
      getStudentHome: jest.fn(),
      getMyClasses: jest.fn(),
    };
    const allowAllGuard: CanActivate = { canActivate: () => true };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        {
          provide: StudentsService,
          useValue: studentsServiceMock,
        },
        {
          provide: MaterialsService,
          useValue: {
            getStudentMaterials: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowAllGuard)
      .overrideGuard(StudentOrParentOwnsStudentGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<StudentsController>(StudentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
