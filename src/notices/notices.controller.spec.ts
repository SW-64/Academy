import { Test, TestingModule } from '@nestjs/testing';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';

import { CanActivate } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClassAccessGuard } from '../auth/guards/class-acces.guard';

describe('NoticesController', () => {
  let controller: NoticesController;

  beforeEach(async () => {
    const noticesServiceMock = {
      createNotice: jest.fn(),
      findAllNotices: jest.fn(),
      findNotice: jest.fn(),
      findPinnedNotices: jest.fn(),
      updateNotice: jest.fn(),
      deleteNotice: jest.fn(),
    };

    const allowAllGuard: CanActivate = { canActivate: () => true };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NoticesController],
      providers: [
        {
          provide: NoticesService,
          useValue: noticesServiceMock,
        },
      ],
    })

      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowAllGuard)
      .overrideGuard(ClassAccessGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<NoticesController>(NoticesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
