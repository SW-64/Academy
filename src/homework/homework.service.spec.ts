import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HomeworkService } from './homework.service';
import { DataSource, Repository } from 'typeorm';

import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { ClassTextbook } from '../class-textbook/entities/class-textbook.entity';
import { ProgressChapter } from './entities/progress-chapter.entity';
import { Progress } from './entities/progress.entity';
import { TextbookChapter } from '../textbook/entities/textbook-chapter.entity';
import { Parent } from '../parents/entities/parent.entity';

describe('HomeworkService - HIGH-1 (학생 이름 조회 최적화)', () => {
  let service: HomeworkService;
  let studentRepo: Repository<Student>;
  let userRepo: Repository<User>;
  let studentClassRepo: Repository<StudentClass>;
  let classTextbookRepo: Repository<ClassTextbook>;
  let progressChapterRepo: Repository<ProgressChapter>;
  let textbookChapterRepo: Repository<TextbookChapter>;

  const qbMock = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        HomeworkService,
        { provide: DataSource, useValue: {} },
        {
          provide: getRepositoryToken(Student),
          useValue: {
            createQueryBuilder: jest.fn(() => qbMock),
            find: jest.fn(),
          },
        },
        { provide: getRepositoryToken(User), useValue: { find: jest.fn() } },
        {
          provide: getRepositoryToken(StudentClass),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(ClassTextbook),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(ProgressChapter),
          useValue: { createQueryBuilder: jest.fn() },
        },
        { provide: getRepositoryToken(Progress), useValue: {} },
        {
          provide: getRepositoryToken(TextbookChapter),
          useValue: { find: jest.fn() },
        },
        { provide: getRepositoryToken(Parent), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(HomeworkService);
    studentRepo = moduleRef.get(getRepositoryToken(Student));
    userRepo = moduleRef.get(getRepositoryToken(User));
    studentClassRepo = moduleRef.get(getRepositoryToken(StudentClass));
    classTextbookRepo = moduleRef.get(getRepositoryToken(ClassTextbook));
    progressChapterRepo = moduleRef.get(getRepositoryToken(ProgressChapter));
    textbookChapterRepo = moduleRef.get(getRepositoryToken(TextbookChapter));

    // Mock 설정
    (classTextbookRepo.findOne as any).mockResolvedValue({
      classTextbookId: 5,
      classId: 1,
      textbookId: 99,
    });

    (studentClassRepo.find as any).mockResolvedValue([
      { studentId: 1 },
      { studentId: 2 },
    ]);

    // JOIN 기반 학생+이름 조회 결과
    qbMock.getRawMany.mockResolvedValue([
      { studentId: 1, userId: 10, name: 'Alice' },
      { studentId: 2, userId: 20, name: 'Bob' },
    ]);

    // 챕터 데이터
    (textbookChapterRepo.find as any).mockResolvedValue([
      { textbookChapterId: 100, largeUnitNo: 1, smallUnitNo: 1 },
    ]);

    // Progress 데이터
    const pcQbMock = {
      innerJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    (progressChapterRepo.createQueryBuilder as any).mockReturnValue(pcQbMock);
  });

  it('학생 이름 조회 시 userRepo.find()를 호출하지 않는다 (JOIN 1회)', async () => {
    await service.getHomeworkProgress(1, 99);

    // JOIN QueryBuilder 사용 검증
    expect((studentRepo as any).createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(qbMock.innerJoin).toHaveBeenCalledWith('s.user', 'u');
    expect(qbMock.getRawMany).toHaveBeenCalledTimes(1);

    // ✅ 핵심: 2-step 방식 제거 검증
    expect((userRepo as any).find).not.toHaveBeenCalled();
  });
});
