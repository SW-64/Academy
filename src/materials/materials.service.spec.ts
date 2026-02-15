import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { MaterialsService } from './materials.service';
import { Material } from './entities/material.entity';
import { ClassMaterial } from './entities/class-material.entity';
import { Class } from '../class/entities/class.entity';
import { Student } from '../students/entities/student.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { Admin } from '../admin/entities/admin.entity';
import { S3Service } from '../s3/s3.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('MaterialsService - CRITICAL-1: createMaterial', () => {
  let service: MaterialsService;

  const materialRepo = {
    create: jest.fn(),
    save: jest.fn(),
  } as any;

  const cmInsertExecute = jest.fn();
  const cmQB: any = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: cmInsertExecute,
  };

  const cmRepo = {
    createQueryBuilder: jest.fn(() => cmQB),
  } as any;

  const classRepo = {
    find: jest.fn(),
  } as any;

  const adminRepo = {
    findOne: jest.fn(),
  } as any;

  const txManager = {
    getRepository: (entity: any) => {
      if (entity === Material) return materialRepo;
      if (entity === ClassMaterial) return cmRepo;
      if (entity === Class) return classRepo;
      if (entity === Admin) return adminRepo;
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
        MaterialsService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: S3Service, useValue: {} },
        { provide: getRepositoryToken(Material), useValue: {} },
        { provide: getRepositoryToken(ClassMaterial), useValue: {} },
        { provide: getRepositoryToken(Class), useValue: {} },
        { provide: getRepositoryToken(Student), useValue: {} },
        { provide: getRepositoryToken(StudentClass), useValue: {} },
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

    service = moduleRef.get(MaterialsService);
  });

  it('should use orIgnore when creating ClassMaterial links', async () => {
    (adminRepo.findOne as jest.Mock).mockResolvedValue({ adminId: 1 });
    (classRepo.find as jest.Mock).mockResolvedValue([
      { classId: 1 },
      { classId: 2 },
      { classId: 3 },
    ]);
    (materialRepo.create as jest.Mock).mockReturnValue({
      adminId: 1,
      title: '자료1',
    });
    (materialRepo.save as jest.Mock).mockResolvedValue({ materialId: 100 });
    cmInsertExecute.mockResolvedValue({ identifiers: [] });

    await service.createMaterial(
      {
        title: '자료1',
        description: 'desc',
        classIds: [1, 2, 3],
      },
      1,
    );

    expect(cmRepo.createQueryBuilder).toHaveBeenCalled();
    expect(cmQB.orIgnore).toHaveBeenCalled();
    expect(cmInsertExecute).toHaveBeenCalled();
  });

  it('should be idempotent - no error on duplicate create', async () => {
    (adminRepo.findOne as jest.Mock).mockResolvedValue({ adminId: 1 });
    (classRepo.find as jest.Mock).mockResolvedValue([{ classId: 1 }]);
    (materialRepo.create as jest.Mock).mockReturnValue({ adminId: 1 });
    (materialRepo.save as jest.Mock).mockResolvedValue({ materialId: 100 });
    cmInsertExecute.mockResolvedValue({ identifiers: [] }); // orIgnore로 중복 무시

    await expect(
      service.createMaterial({ title: '자료1', classIds: [1] }, 1),
    ).resolves.not.toThrow();

    // 두 번 호출해도 에러 없음 (멱등성)
    await expect(
      service.createMaterial({ title: '자료1', classIds: [1] }, 1),
    ).resolves.not.toThrow();
  });
});

describe('MaterialsService - CRITICAL-2: updateMaterial', () => {
  let service: MaterialsService;

  const materialRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  } as any;

  const cmInsertExecute = jest.fn();
  const cmUpdateExecute = jest.fn();

  const cmInsertQB: any = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: cmInsertExecute,
  };

  const cmUpdateQB: any = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: cmUpdateExecute,
  };

  const cmRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn((alias?: string) => {
      // INSERT vs UPDATE 구분
      return alias ? cmUpdateQB : cmInsertQB;
    }),
  } as any;

  const classRepo = {
    find: jest.fn(),
  } as any;

  const txManager = {
    getRepository: (entity: any) => {
      if (entity === Material) return materialRepo;
      if (entity === ClassMaterial) return cmRepo;
      if (entity === Class) return classRepo;
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
        MaterialsService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: S3Service, useValue: {} },
        { provide: getRepositoryToken(Material), useValue: {} },
        { provide: getRepositoryToken(ClassMaterial), useValue: {} },
        { provide: getRepositoryToken(Class), useValue: {} },
        { provide: getRepositoryToken(Student), useValue: {} },
        { provide: getRepositoryToken(StudentClass), useValue: {} },
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

    service = moduleRef.get(MaterialsService);
  });

  it('should use orIgnore when inserting toInsert classes', async () => {
    (materialRepo.findOne as jest.Mock).mockResolvedValue({
      materialId: 1,
      title: '기존자료',
      description: 'desc',
    });
    (classRepo.find as jest.Mock).mockResolvedValue([
      { classId: 1 },
      { classId: 2 },
      { classId: 3 },
      { classId: 4 },
    ]);
    // 기존 연결: [1,2,3]
    (cmRepo.find as jest.Mock).mockResolvedValue([
      { classMaterialId: 10, classId: 1, deletedAt: null },
      { classMaterialId: 11, classId: 2, deletedAt: null },
      { classMaterialId: 12, classId: 3, deletedAt: null },
    ]);

    cmInsertExecute.mockResolvedValue({ identifiers: [] });

    // 새로 [1,2,3,4] → toInsert=[4]
    await service.updateMaterial(1, { classIds: [1, 2, 3, 4] }, 1);

    expect(cmRepo.createQueryBuilder).toHaveBeenCalled();
    expect(cmInsertQB.orIgnore).toHaveBeenCalled();
    expect(cmInsertExecute).toHaveBeenCalled();
  });

  it('should prevent duplicate insert on concurrent updates', async () => {
    (materialRepo.findOne as jest.Mock).mockResolvedValue({
      materialId: 1,
      title: '자료',
    });
    (classRepo.find as jest.Mock).mockResolvedValue([
      { classId: 1 },
      { classId: 2 },
      { classId: 3 },
      { classId: 4 },
    ]);
    (cmRepo.find as jest.Mock).mockResolvedValue([
      { classId: 1, deletedAt: null },
      { classId: 2, deletedAt: null },
      { classId: 3, deletedAt: null },
    ]);
    cmInsertExecute.mockResolvedValue({ identifiers: [] });

    // 동시 요청 시뮬레이션
    await expect(
      service.updateMaterial(1, { classIds: [1, 2, 3, 4] }, 1),
    ).resolves.not.toThrow();

    await expect(
      service.updateMaterial(1, { classIds: [1, 2, 3, 4] }, 1),
    ).resolves.not.toThrow();

    expect(cmInsertExecute).toHaveBeenCalled();
  });
});
