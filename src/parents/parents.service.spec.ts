import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ParentsService } from './parents.service';

import { Parent } from './entities/parent.entity';
import { User, Role, Status } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { MESSAGES } from '../constants/message.constant';

import { paginate } from 'nestjs-typeorm-paginate';

jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('ParentsService (unit)', () => {
  let service: ParentsService;

  let parentRepo: Repository<Parent>;
  let userRepo: Repository<User>;
  let studentRepo: Repository<Student>;
  let studentClassRepo: Repository<StudentClass>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ParentsService,
        {
          provide: getRepositoryToken(Parent),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Student),
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
      ],
    }).compile();

    service = moduleRef.get(ParentsService);

    parentRepo = moduleRef.get(getRepositoryToken(Parent));
    userRepo = moduleRef.get(getRepositoryToken(User));
    studentRepo = moduleRef.get(getRepositoryToken(Student));
    studentClassRepo = moduleRef.get(getRepositoryToken(StudentClass));

    jest.clearAllMocks();
  });

  describe('getMyStudents', () => {
    it('should throw NotFoundException when parent not found', async () => {
      (parentRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getMyStudents(10)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getMyStudents(10)).rejects.toThrow(
        MESSAGES.PARENTS.ERROR.NOT_FOUND,
      );
    });

    it('should return mapped children list ordered by user name', async () => {
      (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 7 });

      const qbMock = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            studentId: '12',
            school: 'ABC고',
            grade: 2,
            userId: '100',
            name: '김철수',
          },
          {
            studentId: '13',
            school: 'DEF고',
            grade: 1,
            userId: '101',
            name: '박영희',
          },
        ]),
      };

      (studentRepo.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);

      const res = await service.getMyStudents(10);

      expect(parentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 10 },
          select: { parentId: true },
        }),
      );

      expect(studentRepo.createQueryBuilder).toHaveBeenCalledWith('s');
      expect(qbMock.orderBy).toHaveBeenCalledWith('u.name', 'ASC');
      expect(res).toEqual([
        {
          studentId: 12,
          school: 'ABC고',
          grade: 2,
          user: { userId: 100, name: '김철수' },
        },
        {
          studentId: 13,
          school: 'DEF고',
          grade: 1,
          user: { userId: 101, name: '박영희' },
        },
      ]);
    });
  });

  describe('findAllParents', () => {
    it('should call paginate with correct where/order/relations/select', async () => {
      (paginate as jest.Mock).mockResolvedValue({
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

      await service.findAllParents(options);

      expect(paginate).toHaveBeenCalledTimes(1);

      const [repoArg, optionsArg, paginateOpts] = (paginate as jest.Mock).mock
        .calls[0];

      expect(repoArg).toBe(userRepo);
      expect(optionsArg).toBe(options);

      expect(paginateOpts).toEqual(
        expect.objectContaining({
          order: { name: 'ASC' },
          relations: ['parent', 'parent.student', 'parent.student.user'],
          where: { role: Role.PARENT, status: Status.approved },
        }),
      );

      // 응답 스펙 깨짐 방지(운영에서 가치 큼)
      expect(paginateOpts.select).toEqual(
        expect.objectContaining({
          userId: true,
          loginId: true,
          name: true,
          status: true,
          role: true,
          phone: true,
          createdAt: true,
          parent: expect.any(Object),
        }),
      );
    });
  });

  describe('findOneParent', () => {
    it('should throw NotFoundException when parent not found', async () => {
      (parentRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOneParent(99)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneParent(99)).rejects.toThrow(
        MESSAGES.PARENTS.ERROR.NOT_FOUND,
      );
    });

    it('should return parent detail when found and request correct relations/select', async () => {
      (parentRepo.findOne as jest.Mock).mockResolvedValue({
        parentId: 1,
        user: { userId: 10, name: '부모' },
        student: { studentId: 2, user: { name: '자녀' } },
      });

      const res = await service.findOneParent(1);

      expect(parentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentId: 1 },
          relations: {
            user: true,
            student: { user: true },
          },
          select: expect.any(Object),
        }),
      );

      expect(res).toEqual(expect.objectContaining({ parentId: 1 }));
    });
  });

  describe('getMyChildClasses', () => {
    it('should throw NotFoundException when parent not found', async () => {
      (parentRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getMyChildClasses(10, 2)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getMyChildClasses(10, 2)).rejects.toThrow(
        MESSAGES.PARENTS.ERROR.NOT_FOUND,
      );
    });

    it('should throw NotFoundException when student not found under parent', async () => {
      (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 7 });
      (studentRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getMyChildClasses(10, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getMyChildClasses(10, 999)).rejects.toThrow(
        MESSAGES.PARENTS.STUDENT.ERROR.NOT_FOUND,
      );
    });

    it('should return mapped class list for child', async () => {
      (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 7 });
      (studentRepo.findOne as jest.Mock).mockResolvedValue({ studentId: 12 });

      const qbMock = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { classId: '1', className: 'A반' },
          { classId: '2', className: 'B반' },
        ]),
      };

      (studentClassRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        qbMock,
      );

      const res = await service.getMyChildClasses(10, 12);

      expect(parentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 10 },
          select: { parentId: true },
        }),
      );

      expect(studentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentId: 7, studentId: 12 },
          select: { studentId: true },
        }),
      );

      expect(studentClassRepo.createQueryBuilder).toHaveBeenCalledWith('sc');
      expect(res).toEqual([
        { classId: 1, className: 'A반' },
        { classId: 2, className: 'B반' },
      ]);
    });
  });
});
