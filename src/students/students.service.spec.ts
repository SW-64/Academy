// students.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StudentsService } from './students.service';

import { User, Role, Status } from '../users/entities/user.entity';
import { Student } from './entities/student.entity';
import { Grade, Level } from '../grades/entities/grade.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';

import { paginate } from 'nestjs-typeorm-paginate';
import { CacheService } from '../cache/cache.service';

jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

type AnyFn = (...args: any[]) => any;

function makeQb<T extends Record<string, AnyFn>>(impl: T): T {
  return impl;
}

describe('StudentsService', () => {
  let service: StudentsService;

  let userRepo: Repository<User>;
  let studentsRepo: Repository<Student>;
  let gradesRepo: Repository<Grade>;
  let studentClassRepo: Repository<StudentClass>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StudentsService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            // findAllStudents에서 paginate(this.userRepository, ...) 형태로 들어감
          },
        },
        {
          provide: getRepositoryToken(Student),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Grade),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StudentClass),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(StudentsService);

    userRepo = moduleRef.get(getRepositoryToken(User));
    studentsRepo = moduleRef.get(getRepositoryToken(Student));
    gradesRepo = moduleRef.get(getRepositoryToken(Grade));
    studentClassRepo = moduleRef.get(getRepositoryToken(StudentClass));

    jest.clearAllMocks();
  });

  describe('getAllGrades', () => {
    it('should return grades and gradeDistribution (fill missing levels with 0)', async () => {
      const gradesListQb = makeQb({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            gradeId: 1,
            examId: 10,
            studentId: 3,
            score: 92,
            level: 'A',
            exam: { year: 2026, exam_date: new Date(), student_average: 70 },
          },
        ]),
      });

      const distributionQb = makeQb({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { level: 'A', count: '2' },
          { level: 'c', count: '1' }, // 소문자도 방어되는지
        ]),
      });

      (gradesRepo.createQueryBuilder as unknown as jest.Mock)
        .mockImplementationOnce(() => gradesListQb)
        .mockImplementationOnce(() => distributionQb);

      const result = await service.getAllGrades(3, 2026, 2);

      expect(gradesRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(result.grades).toHaveLength(1);

      // A~F 모두 존재 + 없는 값 0
      expect(Object.keys(result.gradeDistribution).sort()).toEqual(
        Object.values(Level).sort(),
      );

      expect(result.gradeDistribution['A' as Level]).toBe(2);
      expect(result.gradeDistribution['C' as Level]).toBe(1);
      expect(result.gradeDistribution['B' as Level]).toBe(0);
    });

    it('should apply date range filters with :start and :nextStart', async () => {
      const gradesListQb = makeQb({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const distributionQb = makeQb({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      (gradesRepo.createQueryBuilder as unknown as jest.Mock)
        .mockImplementationOnce(() => gradesListQb)
        .mockImplementationOnce(() => distributionQb);

      await service.getAllGrades(5, 2026, 1);

      const andWhereCalls = gradesListQb.andWhere.mock.calls;

      // "start/nextStart 파라미터가 들어가는 필터가 걸렸는지"만 안정적으로 확인
      expect(
        andWhereCalls.some(
          (c) =>
            String(c[0]).includes('exam.exam_date >= :start') &&
            c[1] &&
            'start' in c[1],
        ),
      ).toBe(true);

      expect(
        andWhereCalls.some(
          (c) =>
            String(c[0]).includes('exam.exam_date < :nextStart') &&
            c[1] &&
            'nextStart' in c[1],
        ),
      ).toBe(true);
    });
  });

  describe('getOneGrade', () => {
    it('should throw NotFoundException when not found', async () => {
      (gradesRepo.findOne as unknown as jest.Mock).mockResolvedValue(null);

      await expect(service.getOneGrade(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should return grade when found', async () => {
      (gradesRepo.findOne as unknown as jest.Mock).mockResolvedValue({
        gradeId: 10,
        studentId: 1,
        exam: { examId: 3 },
      });

      const res = await service.getOneGrade(1, 10);

      expect(gradesRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 1, gradeId: 10 },
          relations: { exam: true },
        }),
      );
      expect(res).toEqual(expect.objectContaining({ gradeId: 10 }));
    });
  });

  describe('getCurrentGrades', () => {
    it('should throw NotFoundException when student not found', async () => {
      (studentsRepo.findOne as unknown as jest.Mock).mockResolvedValue(null);

      await expect(service.getCurrentGrades(7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should return studentName and levels ordered by recent exam date', async () => {
      (studentsRepo.findOne as unknown as jest.Mock).mockResolvedValue({
        studentId: 3,
        user: { name: '홍길동' },
      });

      const qb = makeQb({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ level: 'B' }, { level: 'A' }]),
      });

      (gradesRepo.createQueryBuilder as unknown as jest.Mock).mockReturnValue(
        qb,
      );

      const res = await service.getCurrentGrades(3);

      expect(gradesRepo.createQueryBuilder).toHaveBeenCalledWith('grade');
      expect(res).toEqual({ studentName: '홍길동', grades: ['B', 'A'] });
    });
  });

  describe('findAllStudents', () => {
    it('should call paginate with correct where/order/relations/select', async () => {
      (paginate as unknown as jest.Mock).mockResolvedValue({
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
        links: {},
      });

      const options: any = { page: 1, limit: 10 };

      await service.findAllStudents(options);

      expect(paginate).toHaveBeenCalledTimes(1);

      const callArgs = (paginate as unknown as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe(userRepo);
      expect(callArgs[1]).toBe(options);

      // 3번째 인자: paginate 옵션 객체 검증
      const paginateOptions = callArgs[2];

      expect(paginateOptions).toEqual(
        expect.objectContaining({
          order: { name: 'ASC' },
          relations: ['student', 'student.parent', 'student.parent.user'],
          where: { role: Role.STUDENT, status: Status.approved },
        }),
      );

      // select 구조가 깨지면 프론트/응답 스펙이 깨지므로 운영에서 가치 큼
      expect(paginateOptions.select).toEqual(
        expect.objectContaining({
          userId: true,
          loginId: true,
          name: true,
          role: true,
          phone: true,
          status: true,
          createdAt: true,
          student: expect.any(Object),
        }),
      );
    });
  });

  describe('findOneStudent', () => {
    it('should throw NotFoundException when not found', async () => {
      (studentsRepo.findOne as unknown as jest.Mock).mockResolvedValue(null);

      await expect(service.findOneStudent(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should return student detail when found', async () => {
      (studentsRepo.findOne as unknown as jest.Mock).mockResolvedValue({
        studentId: 1,
        grade: 2,
        user: {
          userId: 10,
          name: '학생',
          loginId: 's1',
          phone: '010',
          status: 'approved',
        },
      });

      const res = await service.findOneStudent(1);

      expect(studentsRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 1 },
          relations: { user: true, parent: true },
        }),
      );
      expect(res).toEqual(expect.objectContaining({ studentId: 1 }));
    });
  });

  describe('getStudentHome', () => {
    it('should throw NotFoundException when student not found', async () => {
      (studentsRepo.findOne as unknown as jest.Mock).mockResolvedValue(null);

      await expect(service.getStudentHome(10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should return student home payload when found', async () => {
      (studentsRepo.findOne as unknown as jest.Mock).mockResolvedValue({
        studentId: 1,
        grade: 3,
        school: '고등학교',
        user: { userId: 10, name: '학생' },
      });

      const res = await service.getStudentHome(10);
      expect(res).toEqual(expect.objectContaining({ studentId: 1 }));
    });
  });

  describe('getMyClasses', () => {
    it('should throw NotFoundException when student not found', async () => {
      (studentsRepo.findOneBy as unknown as jest.Mock).mockResolvedValue(null);

      await expect(service.getMyClasses(10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should map raw rows to { classId:number, className }', async () => {
      (studentsRepo.findOneBy as unknown as jest.Mock).mockResolvedValue({
        studentId: 3,
        userId: 10,
      });

      const qb = makeQb({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { classId: '1', className: 'A반' },
          { classId: '2', className: 'B반' },
        ]),
      });

      (
        studentClassRepo.createQueryBuilder as unknown as jest.Mock
      ).mockReturnValue(qb);

      const res = await service.getMyClasses(10);

      expect(studentClassRepo.createQueryBuilder).toHaveBeenCalledWith('sc');
      expect(res).toEqual([
        { classId: 1, className: 'A반' },
        { classId: 2, className: 'B반' },
      ]);
    });
  });
});
