import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { NoticesService } from './notices.service';
import { Notice } from './entities/notice.entity';
import { ClassNotice } from './entities/class-notice.entity';
import { Admin } from '../admin/entities/admin.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { CacheService } from '../cache/cache.service';

describe('NoticesService - CRITICAL-1: createNotice', () => {
  let service: NoticesService;

  const noticeRepo = {
    insert: jest.fn(),
  } as any;

  const cnInsertExecute = jest.fn();
  const cnQB: any = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: cnInsertExecute,
  };

  const cnRepo = {
    createQueryBuilder: jest.fn(() => cnQB),
  } as any;

  const classRepo = {
    existsBy: jest.fn(),
  } as any;

  const adminRepo = {
    findOne: jest.fn(),
  } as any;

  const actionLogRepo = {
    insert: jest.fn(),
  } as any;

  const txManager = {
    getRepository: (entity: any) => {
      if (entity === Notice) return noticeRepo;
      if (entity === ClassNotice) return cnRepo;
      if (entity === Admin) return adminRepo;
      if (entity === ActionLog) return actionLogRepo;
      if (entity.name === 'Class') return classRepo;
      throw new Error('Unknown repo');
    },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const dataSourceMock = {
      transaction: jest.fn(async (callback) => callback(txManager)),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        NoticesService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: getRepositoryToken(Notice), useValue: {} },
        { provide: getRepositoryToken(Admin), useValue: {} },
        { provide: getRepositoryToken(ActionLog), useValue: {} },
        { provide: getRepositoryToken(ClassNotice), useValue: {} },
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

    service = moduleRef.get(NoticesService);
  });

  it('should use orIgnore when creating ClassNotice', async () => {
    (adminRepo.findOne as jest.Mock).mockResolvedValue({
      adminId: 1,
      userId: 1,
    });
    (classRepo.existsBy as jest.Mock).mockResolvedValue(true);
    (noticeRepo.insert as jest.Mock).mockResolvedValue({
      identifiers: [{ noticeId: 10 }],
      generatedMaps: [{ noticeId: 10 }],
    });
    cnInsertExecute.mockResolvedValue({ identifiers: [] });

    await service.createNotice(
      1,
      { title: '공지1', content: '내용', pinned: false },
      1,
    );

    expect(cnRepo.createQueryBuilder).toHaveBeenCalled();
    expect(cnQB.orIgnore).toHaveBeenCalled();
    expect(cnInsertExecute).toHaveBeenCalled();
  });

  it('should be idempotent - no error on duplicate create', async () => {
    (adminRepo.findOne as jest.Mock).mockResolvedValue({
      adminId: 1,
      userId: 1,
    });
    (classRepo.existsBy as jest.Mock).mockResolvedValue(true);
    (noticeRepo.insert as jest.Mock).mockResolvedValue({
      identifiers: [{ noticeId: 10 }],
      generatedMaps: [{ noticeId: 10 }],
    });
    cnInsertExecute.mockResolvedValue({ identifiers: [] }); // orIgnore로 중복 무시

    await expect(
      service.createNotice(1, { title: '공지1', content: '내용' }, 1),
    ).resolves.not.toThrow();

    // 두 번 호출해도 에러 없음 (멱등성)
    await expect(
      service.createNotice(1, { title: '공지1', content: '내용' }, 1),
    ).resolves.not.toThrow();

    expect(cnQB.orIgnore).toHaveBeenCalled();
  });
});

describe('NoticesService - LOW-1: updateNotice pinned', () => {
  let service: NoticesService;

  const noticeRepo = {
    findOneBy: jest.fn(),
    update: jest.fn(),
  } as any;

  const cnRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  } as any;

  const actionLogRepo = {
    save: jest.fn(),
  } as any;

  const txManager = {
    getRepository: (entity: any) => {
      if (entity === Notice) return noticeRepo;
      if (entity === ClassNotice) return cnRepo;
      if (entity === ActionLog) return actionLogRepo;
      throw new Error('Unknown repo');
    },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const dataSourceMock = {
      transaction: jest.fn(async (callback) => callback(txManager)),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        NoticesService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: getRepositoryToken(Notice), useValue: noticeRepo },
        { provide: getRepositoryToken(Admin), useValue: {} },
        { provide: getRepositoryToken(ActionLog), useValue: actionLogRepo },
        { provide: getRepositoryToken(ClassNotice), useValue: cnRepo },
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

    service = moduleRef.get(NoticesService);
  });

  it('should update pinned when changing true -> false (고정 해제)', async () => {
    // 기존: pinned=true
    (noticeRepo.findOneBy as jest.Mock).mockResolvedValue({
      noticeId: 10,
      title: '공지',
      content: '내용',
    });
    (cnRepo.findOne as jest.Mock).mockResolvedValue({
      classId: 1,
      noticeId: 10,
      pinned: true, // ← 현재 고정됨
    });
    (cnRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });

    // 요청: pinned=false (고정 해제)
    await service.updateNotice(10, { pinned: false }, 1, 1);

    // 검증: update 호출됨
    expect(cnRepo.update).toHaveBeenCalledWith(
      { noticeId: 10, classId: 1 },
      { pinned: false },
    );
  });

  it('should update pinned when changing false -> true (고정)', async () => {
    // 기존: pinned=false
    (noticeRepo.findOneBy as jest.Mock).mockResolvedValue({
      noticeId: 10,
      title: '공지',
      content: '내용',
    });
    (cnRepo.findOne as jest.Mock).mockResolvedValue({
      classId: 1,
      noticeId: 10,
      pinned: false, // ← 현재 고정 안 됨
    });
    (cnRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });

    // 요청: pinned=true (고정)
    await service.updateNotice(10, { pinned: true }, 1, 1);

    // 검증: update 호출됨
    expect(cnRepo.update).toHaveBeenCalledWith(
      { noticeId: 10, classId: 1 },
      { pinned: true },
    );
  });

  it('should not update pinned when value is same', async () => {
    // 기존: pinned=true
    (noticeRepo.findOneBy as jest.Mock).mockResolvedValue({
      noticeId: 10,
      title: '공지',
      content: '내용',
    });
    (cnRepo.findOne as jest.Mock).mockResolvedValue({
      classId: 1,
      noticeId: 10,
      pinned: true,
    });

    // 요청: pinned=true (동일)
    await expect(
      service.updateNotice(10, { pinned: true }, 1, 1),
    ).rejects.toThrow(BadRequestException); // NO_CHANGES

    expect(cnRepo.update).not.toHaveBeenCalled();
  });
});
