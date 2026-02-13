import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GradesService } from './grades.service';
import { Grade } from './entities/grade.entity';
import { Student } from '../students/entities/student.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Exam } from '../exam/entities/exam.entity';
import { User } from '../users/entities/user.entity';

describe('GradesService - HIGH-2: getStudentGradeByParent', () => {
  let service: GradesService;
  let parentRepo: Repository<Parent>;
  let studentRepo: Repository<Student>;
  let examRepo: Repository<Exam>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GradesService,
        {
          provide: getRepositoryToken(Grade),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Student),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Parent),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Exam),
          useValue: {
            find: jest.fn(),
            existsBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(GradesService);
    parentRepo = moduleRef.get(getRepositoryToken(Parent));
    studentRepo = moduleRef.get(getRepositoryToken(Student));
    examRepo = moduleRef.get(getRepositoryToken(Exam));

    jest.clearAllMocks();
  });

  it('should throw NotFoundException when parent not found', async () => {
    // given
    (parentRepo.findOne as jest.Mock).mockResolvedValue(null);

    // when & then
    await expect(
      service.getStudentGradeByParent(1, 100, 10, 'score_desc'),
    ).rejects.toThrow(NotFoundException);

    expect(parentRepo.findOne).toHaveBeenCalledWith({
      where: { userId: 100 },
      select: { parentId: true },
    });
  });

  it('should throw ForbiddenException when student is not child of parent', async () => {
    // given
    (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 7 });
    (studentRepo.findOne as jest.Mock).mockResolvedValue(null);

    // when & then
    await expect(
      service.getStudentGradeByParent(1, 100, 10, 'name_asc'),
    ).rejects.toThrow(ForbiddenException);

    expect(studentRepo.findOne).toHaveBeenCalledWith({
      where: { studentId: 10, parentId: 7 },
      select: { studentId: true },
    });
  });

  it('should return grades when validations pass', async () => {
    // given
    (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 7 });
    (studentRepo.findOne as jest.Mock).mockResolvedValue({ studentId: 10 });
    (examRepo.find as jest.Mock).mockResolvedValue([
      { examId: 1, grades: [{ gradeId: 1, score: 90 }] },
      { examId: 2, grades: [{ gradeId: 2, score: 85 }] },
    ]);

    // when
    const result = await service.getStudentGradeByParent(
      1,
      100,
      10,
      'score_desc',
    );

    // then
    expect(result).toHaveLength(2);
    expect(examRepo.find).toHaveBeenCalled();
  });

  it('should apply score_desc order', async () => {
    // given
    (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 7 });
    (studentRepo.findOne as jest.Mock).mockResolvedValue({ studentId: 10 });
    (examRepo.find as jest.Mock).mockResolvedValue([]);

    // when
    await service.getStudentGradeByParent(1, 100, 10, 'score_desc');

    // then
    expect(examRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { 'grades.score': 'DESC' },
      }),
    );
  });

  it('should apply name_asc order (examDate)', async () => {
    // given
    (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 7 });
    (studentRepo.findOne as jest.Mock).mockResolvedValue({ studentId: 10 });
    (examRepo.find as jest.Mock).mockResolvedValue([]);

    // when
    await service.getStudentGradeByParent(1, 100, 10, 'name_asc');

    // then
    expect(examRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { examDate: 'ASC' },
      }),
    );
  });
});

describe('GradesService - getStudentGrade order', () => {
  let service: GradesService;
  let studentRepo: Repository<Student>;
  let examRepo: Repository<Exam>;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        GradesService,
        {
          provide: getRepositoryToken(Grade),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Student),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Parent),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Exam),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(GradesService);
    studentRepo = moduleRef.get(getRepositoryToken(Student));
    examRepo = moduleRef.get(getRepositoryToken(Exam));

    jest.clearAllMocks();
  });

  it('should apply score_desc order', async () => {
    // given
    (studentRepo.findOne as jest.Mock).mockResolvedValue({ studentId: 10 });

    // when
    await service.getStudentGrade(1, 100, 'score_desc');

    // then
    const queryBuilder = (examRepo.createQueryBuilder as jest.Mock).mock
      .results[0].value;
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('grade.score', 'DESC');
  });

  it('should apply name_asc order (examDate)', async () => {
    // given
    (studentRepo.findOne as jest.Mock).mockResolvedValue({ studentId: 10 });

    // when
    await service.getStudentGrade(1, 100, 'name_asc');

    // then
    const queryBuilder = (examRepo.createQueryBuilder as jest.Mock).mock
      .results[0].value;
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('exam.examDate', 'ASC');
  });
});

describe('GradesService - Privacy Protection', () => {
  let service: GradesService;
  let gradeRepo: Repository<Grade>;
  let studentRepo: Repository<Student>;
  let examRepo: Repository<Exam>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GradesService,
        {
          provide: getRepositoryToken(Grade),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Student),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Parent),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Exam),
          useValue: {
            existsBy: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            existsBy: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(GradesService);
    gradeRepo = moduleRef.get(getRepositoryToken(Grade));
    studentRepo = moduleRef.get(getRepositoryToken(Student));
    examRepo = moduleRef.get(getRepositoryToken(Exam));

    jest.clearAllMocks();
  });

  it('should mask other students names (show only my name)', async () => {
    // given: 학생 본인 studentId = 2
    (studentRepo.findOne as jest.Mock).mockResolvedValue({
      studentId: 2,
      user: { name: '김철수' }, // ← user 정보 추가!
    });
    (examRepo.existsBy as jest.Mock).mockResolvedValue(true);
    (gradeRepo.find as jest.Mock).mockResolvedValue([
      {
        gradeId: 1,
        studentId: 1,
        score: 95,
        ranking: 1,
        isTaken: true,
        student: { user: { name: '홍길동' } },
      },
      {
        gradeId: 2,
        studentId: 2,
        score: 90,
        ranking: 2,
        isTaken: true,
        student: { user: { name: '김철수' } },
      },
      {
        gradeId: 3,
        studentId: 3,
        score: 85,
        ranking: 3,
        isTaken: true,
        student: { user: { name: '이영희' } },
      },
    ]);

    // when
    const result = await service.getMyRank(1, 1, 100);

    // then
    expect(result).toEqual([
      {
        ranking: 1,
        score: 95,
        isTaken: true,
        isMe: false,
        studentId: null,
        name: '세종대왕', // ← 타인: 익명
        school: undefined,
      },
      {
        ranking: 2,
        score: 90,
        isTaken: true,
        isMe: true,
        studentId: 2,
        name: '김철수', // ← 본인: 이름 표시
      },
      {
        ranking: 3,
        score: 85,
        isTaken: true,
        isMe: false,
        studentId: null,
        name: '장영실', // ← 타인: 익명
        school: undefined,
      },
    ]);
  });

  it('should include isMe flag for identification', async () => {
    // given
    (studentRepo.findOne as jest.Mock).mockResolvedValue({
      studentId: 1,
      user: { name: '홍길동' }, // ← user 정보 추가!
    });
    (examRepo.existsBy as jest.Mock).mockResolvedValue(true);
    (gradeRepo.find as jest.Mock).mockResolvedValue([
      {
        gradeId: 1,
        studentId: 1,
        score: 95,
        ranking: 1,
        isTaken: true,
        student: { user: { name: '홍길동' } },
      },
    ]);

    // when
    const result = await service.getMyRank(1, 1, 100);

    // then
    expect(result[0].isMe).toBe(true);
    expect(result[0].name).toBe('홍길동');
  });
});
