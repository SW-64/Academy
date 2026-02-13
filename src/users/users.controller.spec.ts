import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const usersServiceMock = {
      getMyInfo: jest.fn(),
      updateMyInfo: jest.fn(),
      updateMyPassword: jest.fn(),

      getNonApprovedUsers: jest.fn(),
      approveUserAccount: jest.fn(),
      rejectUserAccount: jest.fn(),

      getBlacklistUsers: jest.fn(),
      unBlacklistUser: jest.fn(),

      updateUserInfo: jest.fn(),
      resetUserPassword: jest.fn(),

      linkStudentParent: jest.fn(),
      unlinkStudentParent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
