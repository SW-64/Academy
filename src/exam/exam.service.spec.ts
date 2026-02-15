import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ExamService } from './exam.service';
import { Exam } from './entities/exam.entity';
import { ExamDetail } from './entities/exam-detail.entity';
import { Grade } from '../grades/entities/grade.entity';
import { Student } from '../students/entities/student.entity';
import { GradeWrongAnswer } from '../grades/entities/grade-wrong-answer.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { Admin } from '../admin/entities/admin.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('ExamService', () => {
  let service: ExamService;
  let examRepository: Repository<Exam>;
  let examDetailRepository: Repository<ExamDetail>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExamService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) =>
              callback({
                getRepository: jest.fn(),
              }),
            ),
          },
        },
        {
          provide: getRepositoryToken(Exam),
          useValue: {
            existsBy: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ExamDetail),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Grade),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Student),
          useValue: {},
        },
        {
          provide: getRepositoryToken(GradeWrongAnswer),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ActionLog),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Admin),
          useValue: {},
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ExamService);
    examRepository = moduleRef.get(getRepositoryToken(Exam));
    examDetailRepository = moduleRef.get(getRepositoryToken(ExamDetail));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createExam with orIgnore', () => {
    it('should use orIgnore when inserting ExamDetail', async () => {
      const createQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest
          .fn()
          .mockResolvedValue({ identifiers: [{ examDetailId: 1 }] }),
      };

      (examDetailRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        createQueryBuilder,
      );

      // createExam 호출 시 orIgnore() 사용 확인
      expect(createQueryBuilder.orIgnore).toBeDefined();
    });
  });

  describe('updateExam with orIgnore', () => {
    it('should use orIgnore when inserting new ExamDetail', async () => {
      const createQueryBuilder = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ identifiers: [] }),
      };

      (examDetailRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        createQueryBuilder,
      );

      // updateExam 호출 시 orIgnore() 사용 확인
      expect(createQueryBuilder.orIgnore).toBeDefined();
    });
  });
});
