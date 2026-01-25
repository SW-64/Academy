import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ClassService } from './class.service';
import { Class } from './entities/class.entity';
import { ClassTextbook } from '../class-textbook/entities/class-textbook.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { Student } from '../students/entities/student.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';

describe('ClassService - HIGH-1 IDOR (Guard 적용 후)', () => {
  let service: ClassService;
  let classRepository: Repository<Class>;
  let classTextbookRepository: Repository<ClassTextbook>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassService,
        { provide: DataSource, useValue: {} },
        {
          provide: getRepositoryToken(Class),
          useValue: { existsBy: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(ClassTextbook),
          useValue: { find: jest.fn() },
        },
        { provide: getRepositoryToken(StudentClass), useValue: {} },
        { provide: getRepositoryToken(Student), useValue: {} },
        { provide: getRepositoryToken(ActionLog), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ClassService);
    classRepository = moduleRef.get(getRepositoryToken(Class));
    classTextbookRepository = moduleRef.get(getRepositoryToken(ClassTextbook));

    jest.clearAllMocks();
  });

  it('getAllTextbooksOfClass: Guard가 권한 검증하므로 Service는 비즈니스 로직만', async () => {
    (classRepository.existsBy as any).mockResolvedValue(true);
    (classTextbookRepository.find as any).mockResolvedValue([
      { classTextbookId: 1, textbook: { textbookId: 10, name: '수학' } },
    ]);

    const result = await service.getAllTextbooksOfClass(1);

    // classId만 받음 (userId, userRole 없음)
    expect(classRepository.existsBy).toHaveBeenCalledWith({ classId: 1 });
    expect(classTextbookRepository.find).toHaveBeenCalled();
    expect(result).toEqual([
      { classTextbookId: 1, textbook: { textbookId: 10, name: '수학' } },
    ]);
  });

  it('getAllTextbooksOfClass: 반이 없으면 NotFoundException', async () => {
    (classRepository.existsBy as any).mockResolvedValue(false);

    await expect(service.getAllTextbooksOfClass(999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
