import { Test, TestingModule } from '@nestjs/testing';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';

// 컨트롤러에 Guard가 붙어있다면 DI 에러 방지용(있어도 되고 없어도 됨)
import { CanActivate } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VideoAccessGuard } from '../auth/guards/video-access.guard';
import { ClassAccessGuard } from '../auth/guards/class-acces.guard';

describe('VideosController', () => {
  let controller: VideosController;

  beforeEach(async () => {
    const videosServiceMock = {
      uploadVideo: jest.fn(),
      getAllVideos: jest.fn(),
      getMyVideos: jest.fn(),
      getVideoForStudent: jest.fn(),
      getVideoForAdmin: jest.fn(),
      getPlaybackUrl: jest.fn(),
      updateVideo: jest.fn(),
      deleteVideo: jest.fn(),
      // 컨트롤러에서 직접 쓰는 메서드가 더 있으면 여기에만 추가
    };

    const allowAllGuard: CanActivate = { canActivate: () => true };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideosController],
      providers: [
        {
          provide: VideosService,
          useValue: videosServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowAllGuard)
      .overrideGuard(VideoAccessGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<VideosController>(VideosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
