import { Test } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClassAccessGuard } from './class-acces.guard';
import { Student } from '../../students/entities/student.entity';
import { Parent } from '../../parents/entities/parent.entity';
import { StudentClass } from '../../student-class/entities/student-class.entity';
import { Role } from '../../users/entities/user.entity';

describe('ClassAccessGuard', () => {
  let guard: ClassAccessGuard;
  let studentRepository: Repository<Student>;
  let parentRepository: Repository<Parent>;
  let studentClassRepository: Repository<StudentClass>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassAccessGuard,
        {
          provide: getRepositoryToken(Student),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Parent),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(StudentClass),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = moduleRef.get(ClassAccessGuard);
    studentRepository = moduleRef.get(getRepositoryToken(Student));
    parentRepository = moduleRef.get(getRepositoryToken(Parent));
    studentClassRepository = moduleRef.get(getRepositoryToken(StudentClass));

    jest.clearAllMocks();
  });

  const createMockContext = (
    userId: number,
    role: Role,
    classId: number,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId, role },
          params: { classId: classId.toString() },
        }),
      }),
    } as ExecutionContext;
  };

  describe('ADMIN 권한', () => {
    it('ADMIN은 모든 반에 접근 가능', async () => {
      const context = createMockContext(1, Role.ADMIN, 999);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Repository 호출 없음 (즉시 통과)
      expect(studentRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('STUDENT 권한', () => {
    it('STUDENT가 소속된 반이면 접근 허용', async () => {
      const context = createMockContext(100, Role.STUDENT, 1);

      (studentRepository.findOne as any).mockResolvedValueOnce({
        studentId: 10,
      });
      (studentClassRepository.findOne as any).mockResolvedValueOnce({
        studentClassId: 50,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(studentRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 100 },
        select: { studentId: true },
      });
      expect(studentClassRepository.findOne).toHaveBeenCalled();
    });

    it('STUDENT가 소속되지 않은 반이면 403', async () => {
      const context = createMockContext(100, Role.STUDENT, 2);

      (studentRepository.findOne as any).mockResolvedValueOnce({
        studentId: 10,
      });
      (studentClassRepository.findOne as any).mockResolvedValueOnce(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('STUDENT 정보가 없으면 404', async () => {
      const context = createMockContext(100, Role.STUDENT, 1);

      (studentRepository.findOne as any).mockResolvedValueOnce(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PARENT 권한', () => {
    it('PARENT의 자녀가 소속된 반이면 접근 허용', async () => {
      const context = createMockContext(200, Role.PARENT, 1);

      (parentRepository.findOne as any).mockResolvedValueOnce({
        parentId: 20,
      });
      (studentRepository.find as any).mockResolvedValueOnce([
        { studentId: 30 },
        { studentId: 31 },
      ]);

      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ studentClassId: 60 }),
      };
      (studentClassRepository.createQueryBuilder as any).mockReturnValue(
        qbMock,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('PARENT의 자녀가 소속되지 않은 반이면 403', async () => {
      const context = createMockContext(200, Role.PARENT, 2);

      (parentRepository.findOne as any).mockResolvedValueOnce({
        parentId: 20,
      });
      (studentRepository.find as any).mockResolvedValueOnce([
        { studentId: 30 },
      ]);

      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (studentClassRepository.createQueryBuilder as any).mockReturnValue(
        qbMock,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
