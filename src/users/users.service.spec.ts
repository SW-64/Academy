import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { UsersService } from './users.service';
import { User, Role, Status } from './entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { Parent } from '../parents/entities/parent.entity';
import { RefreshToken } from '../auth/entities/refreshtoken.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';

describe('UsersService - approveUserAccount (CRITICAL-1)', () => {
  let service: UsersService;

  const studentInsertExecute = jest.fn();
  const parentInsertExecute = jest.fn();

  const studentQB = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: studentInsertExecute,
  };

  const parentQB = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: parentInsertExecute,
  };

  const userRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  } as any;

  const studentRepo = {
    createQueryBuilder: jest.fn(() => studentQB),
    findOne: jest.fn(),
  } as any;

  const parentRepo = {
    createQueryBuilder: jest.fn(() => parentQB),
    findOne: jest.fn(),
  } as any;

  const actionLogRepo = {
    save: jest.fn(),
  } as any;

  const txManager = {
    getRepository: (entity: any) => {
      if (entity === User) return userRepo;
      if (entity === Student) return studentRepo;
      if (entity === Parent) return parentRepo;
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
        UsersService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(RefreshToken), useValue: {} },
        { provide: getRepositoryToken(ActionLog), useValue: {} },
        { provide: getRepositoryToken(Student), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('should use orIgnore when creating Student', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValue({
      userId: 1,
      role: Role.STUDENT,
      status: Status.pending,
      signupGrade: 2,
      signupSchool: 'ABC',
    });

    studentInsertExecute.mockResolvedValue({ identifiers: [{ studentId: 1 }] });

    await service.approveUserAccount(1, 100);

    expect(studentQB.orIgnore).toHaveBeenCalled();
    expect(studentInsertExecute).toHaveBeenCalled();
  });

  it('should use orIgnore when creating Parent', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValue({
      userId: 2,
      role: Role.PARENT,
      status: Status.pending,
    });

    parentInsertExecute.mockResolvedValue({ identifiers: [{ parentId: 1 }] });

    await service.approveUserAccount(2, 100);

    expect(parentQB.orIgnore).toHaveBeenCalled();
    expect(parentInsertExecute).toHaveBeenCalled();
  });

  it('should be idempotent - no error on duplicate approve', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValue({
      userId: 1,
      role: Role.STUDENT,
      status: Status.pending,
      signupGrade: 2,
      signupSchool: 'ABC',
    });

    studentInsertExecute.mockResolvedValue({ identifiers: [] });

    await expect(service.approveUserAccount(1, 100)).resolves.not.toThrow();
    await expect(service.approveUserAccount(1, 100)).resolves.not.toThrow();

    expect(studentQB.orIgnore).toHaveBeenCalled();
  });
});

describe('UsersService - linkStudentParent (CRITICAL-2)', () => {
  let service: UsersService;

  const studentRepo = {
    update: jest.fn(),
    exist: jest.fn(),
    findOne: jest.fn(),
  } as any;

  const parentRepo = {
    findOne: jest.fn(),
  } as any;

  const actionLogRepo = {
    save: jest.fn(),
  } as any;

  const txManager = {
    getRepository: (entity: any) => {
      if (entity === Student) return studentRepo;
      if (entity === Parent) return parentRepo;
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
        UsersService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(RefreshToken), useValue: {} },
        { provide: getRepositoryToken(ActionLog), useValue: {} },
        { provide: getRepositoryToken(Student), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('should succeed when conditional update affected=1', async () => {
    (studentRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });
    (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 10 });

    await expect(service.linkStudentParent(1, 10, 100)).resolves.not.toThrow();
  });

  it('should throw when already linked (affected=0)', async () => {
    (studentRepo.update as jest.Mock).mockResolvedValue({ affected: 0 });
    (studentRepo.exist as jest.Mock).mockResolvedValue(true);
    (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 10 });

    await expect(service.linkStudentParent(1, 10, 100)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should prevent race condition', async () => {
    (studentRepo.update as jest.Mock)
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });

    (studentRepo.exist as jest.Mock).mockResolvedValue(true);
    (parentRepo.findOne as jest.Mock).mockResolvedValue({ parentId: 10 });

    await expect(service.linkStudentParent(1, 10, 100)).resolves.not.toThrow();
    await expect(service.linkStudentParent(1, 20, 100)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('UsersService - updateMyPassword (HIGH-1)', () => {
  let service: UsersService;

  const userRepo = {
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  } as any;

  const rtRepo = {
    delete: jest.fn(),
  } as any;

  const actionLogRepo = {
    save: jest.fn(),
  } as any;

  const lockedUser = {
    userId: 1,
    password: '$2b$10$abcdefghijklmnopqrstuvwxyz',
  };

  const qb = {
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(lockedUser),
  };

  const txManager = {
    getRepository: (entity: any) => {
      if (entity === User) return userRepo;
      if (entity === RefreshToken) return rtRepo;
      if (entity === ActionLog) return actionLogRepo;
      throw new Error('Unknown repo');
    },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    (userRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    (userRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });
    (rtRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

    const dataSourceMock = {
      transaction: jest.fn(async (callback) => callback(txManager)),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: ConfigService, useValue: { get: jest.fn(() => 10) } },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(RefreshToken), useValue: {} },
        { provide: getRepositoryToken(ActionLog), useValue: {} },
        { provide: getRepositoryToken(Student), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('should use pessimistic lock when changing password', async () => {
    const user = { userId: 1, role: Role.STUDENT };
    const changePasswordDto = {
      currentPassword: 'OldPw!1',
      newPassword: 'NewPw!1',
      newPasswordConfirm: 'NewPw!1',
    };

    const bcrypt = require('bcrypt');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed');

    await service.updateMyPassword(user, changePasswordDto);

    expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(qb.getOne).toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});
