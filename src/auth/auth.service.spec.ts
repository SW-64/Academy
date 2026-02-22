import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refreshtoken.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';

describe('AuthService - CRITICAL-1: setCurrentRefreshToken', () => {
  let service: AuthService;
  let refreshTokenRepo: Repository<RefreshToken>;

  const qbMock = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orUpdate: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({
      identifiers: [],
      generatedMaps: [],
      raw: [],
    }),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REFRESH_TOKEN_HASH') return 10;
              if (key === 'REFRESH_TOKEN_EXPIRES_IN') return 604800; // 7일
              return null;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            createQueryBuilder: jest.fn(() => qbMock),
            findOneBy: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ActionLog),
          useValue: {},
        },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    refreshTokenRepo = moduleRef.get(getRepositoryToken(RefreshToken));

    jest.clearAllMocks();
  });

  it('should use orUpdate (upsert) for concurrent login safety', async () => {
    // given
    const userId = 10;
    const refreshToken = 'test_refresh_token';

    // when
    await service.setCurrentRefreshToken(refreshToken, userId);

    // then
    expect(refreshTokenRepo.createQueryBuilder).toHaveBeenCalled();
    expect(qbMock.orUpdate).toHaveBeenCalledWith(
      ['refreshtoken', 'expires_at'],
      ['userId'],
    );
    expect(qbMock.execute).toHaveBeenCalled();
  });

  it('should not throw on concurrent calls (idempotency)', async () => {
    // given
    const userId = 10;
    const refreshToken = 'test_refresh_token';

    // when: 동시 2회 호출 시뮬레이션
    await expect(
      Promise.all([
        service.setCurrentRefreshToken(refreshToken, userId),
        service.setCurrentRefreshToken(refreshToken, userId),
      ]),
    ).resolves.not.toThrow();

    // then
    expect(qbMock.execute).toHaveBeenCalledTimes(2);
  });
});

describe('AuthService - MEDIUM-1: signUp validation', () => {
  let service: AuthService;
  let userRepo: Repository<User>;
  let mockManagerSave: jest.Mock;

  beforeEach(async () => {
    mockManagerSave = jest.fn().mockImplementation((entity, data) => {
      if (entity === User) return Promise.resolve({ userId: 1, ...data });
      if (entity === ActionLog) return Promise.resolve({});
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'PASSWORD_HASH') return 10;
              return null;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn().mockResolvedValue(null), // 중복 없음
            save: jest.fn().mockResolvedValue({ userId: 1 }),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ActionLog),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) =>
              callback({ save: mockManagerSave }),
            ),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    userRepo = moduleRef.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should throw when role=PARENT but signupSchool/signupGrade provided', async () => {
    // given
    const dto: any = {
      name: '홍길동',
      loginId: 'parent',
      password: 'Test1234!',
      passwordConfirm: 'Test1234!',
      role: 'PARENT',
      phone: '01012345678',
      signupSchool: '서울대학교', // ← 금지된 필드
      signupGrade: 2, // ← 금지된 필드
    };

    // when & then
    await expect(service.signUp(dto)).rejects.toThrow(BadRequestException);
  });

  it('should allow STUDENT with signupSchool/signupGrade', async () => {
    // given
    const dto: any = {
      name: '학생',
      loginId: 'student',
      password: 'Test1234!',
      passwordConfirm: 'Test1234!',
      role: 'STUDENT',
      phone: '01012345678',
      signupSchool: '서울대학교',
      signupGrade: 2,
    };

    // when
    await expect(service.signUp(dto)).resolves.not.toThrow();

    // then - 실제로 호출된 mock으로 검증
    expect(mockManagerSave).toHaveBeenCalledWith(
      User,
      expect.objectContaining({ signupSchool: '서울대학교', signupGrade: 2 }),
    );
  });

  it('should throw when role=STUDENT but missing signupSchool/signupGrade', async () => {
    // given
    const dto: any = {
      name: '학생',
      loginId: 'student',
      password: 'Test1234!',
      passwordConfirm: 'Test1234!',
      role: 'STUDENT',
      phone: '01012345678',
      // signupSchool, signupGrade 없음
    };

    // when & then
    await expect(service.signUp(dto)).rejects.toThrow(BadRequestException);
  });
});
