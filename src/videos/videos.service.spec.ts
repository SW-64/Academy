import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VideosService } from './videos.service';
import { Video, VideoStatus } from './entities/video.entity';
import { StudentVideo } from './entities/student-video.entity';
import { Student } from '../students/entities/student.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { BunnyService } from './bunny.service';

describe('VideosService', () => {
  let service: VideosService;
  let videoRepository: Repository<Video>;
  let studentVideoRepository: Repository<StudentVideo>;
  let studentRepository: Repository<Student>;
  let bunnyService: BunnyService;
  let dataSource: DataSource;

  const mockVideoRepository = {
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    existsBy: jest.fn(),
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    increment: jest.fn(),
  };

  const mockStudentVideoRepository = {
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  const mockStudentRepository = {
    find: jest.fn(),
  };

  const mockActionLogRepository = {
    insert: jest.fn(),
    save: jest.fn(),
  };

  const mockBunnyService = {
    createVideo: jest.fn(),
    uploadVideoStream: jest.fn(),
    deleteVideo: jest.fn(),
    getVideo: jest.fn(),
    getPlaybackUrl: jest.fn(),
    getThumbnailUrl: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        {
          provide: getRepositoryToken(Video),
          useValue: mockVideoRepository,
        },
        {
          provide: getRepositoryToken(StudentVideo),
          useValue: mockStudentVideoRepository,
        },
        {
          provide: getRepositoryToken(Student),
          useValue: mockStudentRepository,
        },
        {
          provide: getRepositoryToken(ActionLog),
          useValue: mockActionLogRepository,
        },
        {
          provide: BunnyService,
          useValue: mockBunnyService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<VideosService>(VideosService);
    videoRepository = module.get(getRepositoryToken(Video));
    studentVideoRepository = module.get(getRepositoryToken(StudentVideo));
    studentRepository = module.get(getRepositoryToken(Student));
    bunnyService = module.get<BunnyService>(BunnyService);
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('CRITICAL-1: uploadVideo', () => {
    it('업로드 실패 시 StudentVideo가 생성되지 않아야 한다', async () => {
      // Given
      const mockFile: any = {
        path: '/tmp/test-video.mp4',
        size: 1024 * 1024 * 100, // 100MB
        mimetype: 'video/mp4',
      };

      const createVideoDto = {
        title: '수학 특강',
        studentIds: [1, 2, 3],
      };

      mockStudentRepository.find.mockResolvedValue([
        { studentId: 1 },
        { studentId: 2 },
        { studentId: 3 },
      ]);

      mockBunnyService.createVideo.mockResolvedValue({
        guid: 'bunny-video-guid',
      });

      // 트랜잭션 모킹 (Video만 저장)
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn((entity) => {
            if (entity === Video) {
              return {
                save: jest.fn().mockResolvedValue({
                  videoId: 123,
                  title: '수학 특강',
                  bunnyVideoId: 'bunny-video-guid',
                  status: VideoStatus.UPLOADING,
                }),
              };
            }
            if (entity === ActionLog) {
              return {
                insert: jest.fn().mockResolvedValue({}),
              };
            }
            return {};
          }),
        };
        return callback(mockManager);
      });

      // 업로드 실패를 시뮬레이션하기 위해 spy 사용
      const uploadSpy = jest
        .spyOn(service as any, 'uploadVideoToBundleWithAssignment')
        .mockImplementation(async () => {
          // 업로드 실패 시뮬레이션
          await mockVideoRepository.update(123, {
            status: VideoStatus.FAILED,
          });
        });

      // When
      const result = await service.uploadVideo(createVideoDto, mockFile, 999);

      // Then
      expect(result.videoId).toBe(123);
      expect(result.status).toBe(VideoStatus.UPLOADING);
      expect(uploadSpy).toHaveBeenCalledWith(
        123,
        'bunny-video-guid',
        '/tmp/test-video.mp4',
        [1, 2, 3],
      );

      // 업로드 실패 시 status만 FAILED로 변경되고 StudentVideo는 생성 안 됨
      expect(mockVideoRepository.update).toHaveBeenCalledWith(123, {
        status: VideoStatus.FAILED,
      });
    });
  });

  describe('HIGH-1: getAllVideos', () => {
    it('assignedStudentCount가 포함되어 반환되어야 한다', async () => {
      // Given
      const mockQueryBuilder: any = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [
            {
              videoId: 1,
              title: '수학 특강',
              status: VideoStatus.READY,
              viewCount: 100,
              createdAt: new Date(),
            },
          ],
          raw: [
            {
              assignedStudentCount: '5',
            },
          ],
        }),
        getCount: jest.fn().mockResolvedValue(1),
      };

      mockVideoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // When
      const result = await service.getAllVideos({ page: 1, limit: 20 });

      // Then
      expect(result.data[0].assignedStudentCount).toBe(5);
      expect(result.data[0].videoId).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('CRITICAL-2: deleteVideo', () => {
    it('Video 삭제 시 StudentVideo도 함께 삭제되어야 한다', async () => {
      // Given
      mockVideoRepository.findOne.mockResolvedValue({
        videoId: 100,
        bunnyVideoId: 'bunny-guid',
        status: VideoStatus.READY,
      });

      const mockStudentVideoRepoInTransaction = {
        delete: jest.fn().mockResolvedValue({ affected: 3 }),
      };

      const mockVideoRepoInTransaction = {
        update: jest.fn().mockResolvedValue({}),
        softDelete: jest.fn().mockResolvedValue({}),
      };

      const mockLogRepoInTransaction = {
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn((entity) => {
            if (entity === StudentVideo)
              return mockStudentVideoRepoInTransaction;
            if (entity === Video) return mockVideoRepoInTransaction;
            if (entity === ActionLog) return mockLogRepoInTransaction;
            return {};
          }),
        };
        return callback(mockManager);
      });

      // When
      await service.deleteVideo(100, 999);

      // Then
      // StudentVideo가 먼저 삭제되어야 함
      expect(mockStudentVideoRepoInTransaction.delete).toHaveBeenCalledWith({
        videoId: 100,
      });

      // Video가 soft delete 되어야 함
      expect(mockVideoRepoInTransaction.update).toHaveBeenCalledWith(100, {
        status: VideoStatus.DELETING,
      });
      expect(mockVideoRepoInTransaction.softDelete).toHaveBeenCalledWith(100);
    });
  });
});
