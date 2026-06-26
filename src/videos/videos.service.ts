import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Video, VideoStatus } from './entities/video.entity';
import { DataSource, In, IsNull, LessThan, Repository } from 'typeorm';
import {
  AssignedStudentDto,
  VideoDetailForAdminDto,
  VideoDetailForStudentDto,
  VideoListResponseDto,
  VideoPlaybackResponseDto,
  VideoResponseDto,
} from './dto/video-response.dto';
import { BunnyService } from './bunny.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { StudentVideo } from './entities/student-video.entity';
import { Student } from './../students/entities/student.entity';

import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { UpdateVideoDto } from './dto/update-video.dto';
import { PaginatedResponse, PaginationDto } from './dto/pagination.dto';

import { unlink } from 'fs/promises';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(StudentVideo)
    private studentVideoRepository: Repository<StudentVideo>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(ActionLog)
    private actionLogRepository: Repository<ActionLog>,
    private bunnyService: BunnyService,
    private dataSource: DataSource,
  ) {}
  /**
   * 영상 업로드 (ADMIN만 가능)
   */
  async uploadVideo(
    createVideoDto: CreateVideoDto,
    file: Express.Multer.File,
    userIdOfAdmin: number,
  ): Promise<VideoResponseDto> {
    const { title, studentIds } = createVideoDto;

    // 0. 파일 검증
    if (!file) {
      throw new BadRequestException('영상 파일을 업로드해주세요.');
    }

    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxSize) {
      throw new BadRequestException('파일 크기는 5GB를 초과할 수 없습니다.');
    }

    const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        '지원하지 않는 영상 형식입니다. (mp4, mpeg, mov만 가능)',
      );
    }
    // 1. studentIds 검증 추가
    if (studentIds && studentIds.length > 0) {
      // 중복 제거
      const uniqueStudentIds = [...new Set(studentIds)];

      // 실제 존재하는 학생인지 확인
      const existingStudents = await this.studentRepository.find({
        where: {
          studentId: In(uniqueStudentIds),
          deletedAt: IsNull(), // soft delete 고려
        },
        select: ['studentId'],
      });

      if (existingStudents.length !== uniqueStudentIds.length) {
        const existingIds = existingStudents.map((s) => s.studentId);
        const missingIds = uniqueStudentIds.filter(
          (id) => !existingIds.includes(id),
        );

        throw new BadRequestException(
          `존재하지 않는 학생 ID가 포함되어 있습니다: ${missingIds.join(', ')}`,
        );
      }

      // 검증된 ID로 교체
      createVideoDto.studentIds = uniqueStudentIds;
    }
    // 2. Bunny에 영상 메타데이터 생성
    let bunnyVideo;
    try {
      bunnyVideo = await this.bunnyService.createVideo(title);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Bunny API 호출 실패', {
        method: 'createVideo',
        title,
        error: err.message,
        stack: err.stack,
      });
      throw new InternalServerErrorException(
        '영상 생성 중 오류가 발생했습니다.',
      );
    }

    // 추가 안전장치
    if (!bunnyVideo || !bunnyVideo.guid) {
      this.logger.error('Bunny 응답 이상', { bunnyVideo });
      throw new InternalServerErrorException(
        '영상 생성 중 오류가 발생했습니다.',
      );
    }

    // 3. DB 트랜잭션으로 저장
    try {
      const savedVideo = await this.dataSource.transaction(async (manager) => {
        const videoRepo = manager.getRepository(Video);
        const studentVideoRepo = manager.getRepository(StudentVideo);
        const logRepo = manager.getRepository(ActionLog);

        // 영상 정보 저장
        const video = await videoRepo.save({
          title,
          bunnyVideoId: bunnyVideo.guid,
          status: VideoStatus.UPLOADING,
        });

        // // 학생들에게 영상 할당
        // if (createVideoDto.studentIds && createVideoDto.studentIds.length > 0) {
        //   await studentVideoRepo
        //     .createQueryBuilder()
        //     .insert()
        //     .into(StudentVideo)
        //     .values(
        //       createVideoDto.studentIds.map((studentId) => ({
        //         studentId,
        //         videoId: video.videoId,
        //       })),
        //     )
        //     .orIgnore()
        //     .execute();
        // }

        // 로그 저장
        await logRepo.insert({
          actorId: userIdOfAdmin,
          actorType: 'admin',
          action: 'CREATE_VIDEOS',
          targetType: 'video',
          targetId: video.videoId,
          description: `Admin created a video (videoId: ${video.videoId})`,
          createdAt: new Date(),
        });

        return video;
      });

      // 4. ✅ 비동기로 파일 업로드 + 성공 시 학생 할당
      this.uploadVideoToBundleWithAssignment(
        savedVideo.videoId,
        bunnyVideo.guid,
        file.path,
        createVideoDto.studentIds,
      );

      return this.toResponseDto(savedVideo);
    } catch (error) {
      // DB 저장 실패 시 Bunny 영상 삭제
      try {
        await this.bunnyService.deleteVideo(bunnyVideo.guid);
      } catch (deleteError) {
        const delErr = deleteError instanceof Error ? deleteError : new Error(String(deleteError));
        this.logger.error('Bunny 영상 삭제 실패', {
          bunnyVideoId: bunnyVideo.guid,
          error: delErr.message,
          stack: delErr.stack,
        });
      }

      throw error;
    }
  }

  /**
   * 실제 파일 업로드 + 성공 시 학생 할당 (비동기)
   */
  private async uploadVideoToBundleWithAssignment(
    videoId: number,
    bunnyVideoId: string,
    filePath: string,
    studentIds: number[],
  ): Promise<void> {
    try {
      // Stream 업로드
      await this.bunnyService.uploadVideoStream(bunnyVideoId, filePath);

      // 업로드 성공 후 트랜잭션으로 상태 변경 + 학생 할당
      await this.dataSource.transaction(async (manager) => {
        const videoRepo = manager.getRepository(Video);
        const studentVideoRepo = manager.getRepository(StudentVideo);

        // 1. 상태 변경
        await videoRepo.update(videoId, {
          status: VideoStatus.ENCODING,
        });

        // 2. 학생 할당 생성
        if (studentIds && studentIds.length > 0) {
          await studentVideoRepo
            .createQueryBuilder()
            .insert()
            .into(StudentVideo)
            .values(
              studentIds.map((studentId) => ({
                studentId,
                videoId: videoId,
              })),
            )
            .orIgnore()
            .execute();
        }
      });

      // 업로드 완료 후 임시 파일 삭제
      await unlink(filePath).catch((err) => {
        this.logger.warn('임시 파일 삭제 실패', {
          filePath,
          error: err.message,
        });
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Bunny 업로드 실패:', {
        videoId,
        bunnyVideoId,
        filePath,
        error: err.message,
        stack: err.stack,
      });

      // 실패 시 StudentVideo는 생성되지 않고 상태만 FAILED로
      await this.videoRepository.update(videoId, {
        status: VideoStatus.FAILED,
      });

      // Bunny에 생성된 영상 객체 보상 삭제
      try {
        await this.bunnyService.deleteVideo(bunnyVideoId);
      } catch (deleteError) {
        const delErr = deleteError instanceof Error ? deleteError : new Error(String(deleteError));
        this.logger.error('Bunny 보상 삭제 실패 (배치에서 재시도)', {
          videoId,
          bunnyVideoId,
          error: delErr.message,
        });
      }

      // 실패해도 임시 파일 삭제 시도
      await unlink(filePath).catch(() => {});
    }
  }

  /**
   * 전체 영상 목록 조회 (어드민용)
   */
  async getAllVideos(
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<VideoListResponseDto>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // ✅ getRawAndEntities로 변경
    const queryBuilder = this.videoRepository
      .createQueryBuilder('v')
      .leftJoin('v.studentVideos', 'sv')
      .select([
        'v.videoId',
        'v.title',
        'v.thumbnailUrl',
        'v.duration',
        'v.status',
        'v.viewCount',
        'v.createdAt',
      ])
      .addSelect('COUNT(sv.studentVideoId)', 'assignedStudentCount')
      .where('v.deletedAt IS NULL')
      .groupBy('v.videoId')
      .addGroupBy('v.title')
      .addGroupBy('v.thumbnailUrl')
      .addGroupBy('v.duration')
      .addGroupBy('v.status')
      .addGroupBy('v.viewCount')
      .addGroupBy('v.createdAt')
      .orderBy('v.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // ✅ getRawAndEntities 사용
    const { entities: videos, raw } = await queryBuilder.getRawAndEntities();

    // ✅ total은 별도 쿼리
    const total = await this.videoRepository
      .createQueryBuilder('v')
      .where('v.deletedAt IS NULL')
      .getCount();

    // ✅ raw 데이터와 entity 매핑
    const data = videos.map((video, index) => {
      const assignedStudentCount =
        parseInt(raw[index].assignedStudentCount) || 0;

      return {
        ...this.toListResponseDto(video),
        assignedStudentCount,
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 내 영상 목록 조회 (학생용)
   */
  async getMyVideos(
    userIdOfStudent: number,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<VideoListResponseDto>> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [videos, total] = await this.videoRepository
      .createQueryBuilder('v')
      .innerJoin('v.studentVideos', 'sv')
      .innerJoin('sv.student', 's')
      .where('s.userId = :userId', { userId: userIdOfStudent })
      .andWhere('v.deletedAt IS NULL')
      .andWhere('s.deletedAt IS NULL')
      .andWhere('v.status = :status', { status: VideoStatus.READY }) //  READY만 노출
      .select([
        'v.videoId',
        'v.title',
        'v.thumbnailUrl',
        'v.duration',
        'v.status',
        'v.viewCount',
        'v.createdAt',
      ])
      .orderBy('v.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = videos.map((video) => this.toListResponseDto(video));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 영상 상세 조회 (학생용)
   * - title, 썸네일만 (재생 X)
   */
  async getVideoForStudent(videoId: number): Promise<VideoDetailForStudentDto> {
    const video = await this.videoRepository.findOne({
      where: { videoId },
      select: {
        videoId: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        viewCount: true,
        status: true,
        createdAt: true,
      },
    });

    if (!video) {
      throw new NotFoundException('영상을 찾을 수 없습니다.');
    }

    return video;
  }

  /**
   * 영상 상세 조회 (어드민용)
   * - title, 썸네일, 할당된 학생 목록
   */
  async getVideoForAdmin(videoId: number): Promise<VideoDetailForAdminDto> {
    const video = await this.videoRepository.findOne({
      where: { videoId },
      select: {
        videoId: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        viewCount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!video) {
      throw new NotFoundException('영상을 찾을 수 없습니다.');
    }

    // 할당된 학생 목록 조회
    const studentVideos = await this.studentVideoRepository
      .createQueryBuilder('sv')
      .leftJoin('sv.student', 's')
      .leftJoin('s.user', 'u')
      .where('sv.videoId = :videoId', { videoId })
      .orderBy('u.name', 'ASC')
      .select(['sv.studentVideoId', 'sv.studentId', 's.studentId', 'u.name'])
      .getMany();

    const assignedStudents: AssignedStudentDto[] = studentVideos.map((sv) => ({
      studentId: sv.student.studentId,
      name: sv.student.user.name,
    }));

    return {
      videoId: video.videoId,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      status: video.status,
      viewCount: video.viewCount,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      assignedStudents,
    };
  }

  /**
   * 영상 재생 URL 조회 (인코딩 상태도 함께 업데이트)
   */
  async getPlaybackUrl(
    videoId: number,
    userId: number,
  ): Promise<VideoPlaybackResponseDto> {
    const video = await this.videoRepository.findOne({
      where: { videoId },
      select: {
        videoId: true,
        status: true,
        bunnyVideoId: true,
        thumbnailUrl: true,
        title: true,
        duration: true,
      },
    });
    if (!video) {
      throw new NotFoundException('영상을 찾을 수 없습니다.');
    }

    // 인코딩 중이거나 업로드 중인 경우 Bunny에서 최신 상태 확인
    if (
      video.status === VideoStatus.ENCODING ||
      video.status === VideoStatus.UPLOADING
    ) {
      await this.updateVideoStatus(video);
    }

    // 아직 준비되지 않은 경우
    if (video.status !== VideoStatus.READY) {
      throw new BadRequestException(
        '영상이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.',
      );
    }

    // 조회수 증가
    await this.incrementViewCount(videoId);

    // 로그 저장
    await this.actionLogRepository.insert({
      actorId: userId,
      actorType: 'user',
      action: 'VIEW_VIDEOS',
      targetType: 'video',
      targetId: videoId,
      description: `User view a video (videoId: ${videoId})`,
      createdAt: new Date(),
    });
    return {
      playbackUrl: this.bunnyService.getPlaybackUrl(video.bunnyVideoId),
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      duration: video.duration,
    };
  }

  /**
   * 영상 상태 업데이트 (Bunny에서 최신 정보 가져오기)
   */
  private async updateVideoStatus(video: Video): Promise<void> {
    try {
      const bunnyVideo = await this.bunnyService.getVideo(video.bunnyVideoId);
      // 인코딩 완료 (status 4)
      if (bunnyVideo.status === 4) {
        await this.videoRepository.update(
          { videoId: video.videoId },
          {
            status: VideoStatus.READY,
            duration: bunnyVideo.length,
            thumbnailUrl: this.bunnyService.getThumbnailUrl(
              video.bunnyVideoId,
              bunnyVideo.thumbnailFileName,
            ),
          },
        );
        video.status = VideoStatus.READY;
      }
      // 인코딩 중 (status 2, 3)
      else if (bunnyVideo.status === 2 || bunnyVideo.status === 3) {
        await this.videoRepository.update(video.videoId, {
          status: VideoStatus.ENCODING,
        });
      }
    } catch (error) {
      // Bunny API 오류 시 FAILED 상태로 변경
      await this.videoRepository.update(
        { videoId: video.videoId },
        {
          status: VideoStatus.FAILED,
        },
      );
    }
  }

  /**
   * 조회수 증가
   */
  private async incrementViewCount(videoId: number): Promise<void> {
    await this.videoRepository.increment({ videoId }, 'viewCount', 1);
  }

  /**
   * 영상 정보 수정 (제목 + 할당 학생)
   */
  async updateVideo(
    videoId: number,
    updateVideoDto: UpdateVideoDto,
    userIdOfAdmin: number,
  ): Promise<VideoDetailForAdminDto> {
    // 영상 존재 확인
    const videoExists = await this.videoRepository.existsBy({ videoId });
    if (!videoExists) {
      throw new NotFoundException('영상을 찾을 수 없습니다.');
    }
    // studentIds 검증 추가
    if (updateVideoDto.studentIds !== undefined) {
      if (updateVideoDto.studentIds.length > 0) {
        // 중복 제거
        const uniqueStudentIds = [...new Set(updateVideoDto.studentIds)];

        // 실제 존재하는 학생인지 확인
        const existingStudents = await this.studentRepository.find({
          where: {
            studentId: In(uniqueStudentIds),
            deletedAt: IsNull(),
          },
          select: ['studentId'],
        });

        if (existingStudents.length !== uniqueStudentIds.length) {
          const existingIds = existingStudents.map((s) => s.studentId);
          const missingIds = uniqueStudentIds.filter(
            (id) => !existingIds.includes(id),
          );

          throw new BadRequestException(
            `존재하지 않는 학생 ID가 포함되어 있습니다: ${missingIds.join(', ')}`,
          );
        }

        // 검증된 ID로 교체
        updateVideoDto.studentIds = uniqueStudentIds;
      }
    }
    // 트랜잭션으로 전체 수정 작업 수행
    await this.dataSource.transaction(async (manager) => {
      const videoRepo = manager.getRepository(Video);
      const studentVideoRepo = manager.getRepository(StudentVideo);
      const logRepo = manager.getRepository(ActionLog);

      // 1. 제목 수정
      if (updateVideoDto.title) {
        await videoRepo.update(videoId, {
          title: updateVideoDto.title,
        });
      }

      // 2. 학생 할당 수정 (차분 계산 방식)
      if (updateVideoDto.studentIds !== undefined) {
        if (updateVideoDto.studentIds.length === 0) {
          // 의도: 모든 학생 제거
          await studentVideoRepo.delete({ videoId });
        } else {
          // 기존 할당된 학생 목록 조회
          const existingAssignments = await studentVideoRepo.find({
            where: { videoId },
            select: { studentId: true },
          });
          const existingStudentIds = existingAssignments.map(
            (sv) => sv.studentId,
          );

          // 신규 학생 목록
          const newStudentIds = updateVideoDto.studentIds;

          // 추가할 학생 (신규에는 있지만 기존에는 없음)
          const studentsToAdd = newStudentIds.filter(
            (id) => !existingStudentIds.includes(id),
          );

          // 제거할 학생 (기존에는 있지만 신규에는 없음)
          const studentsToRemove = existingStudentIds.filter(
            (id) => !newStudentIds.includes(id),
          );

          // 추가 작업
          if (studentsToAdd.length > 0) {
            await studentVideoRepo
              .createQueryBuilder()
              .insert()
              .into(StudentVideo)
              .values(
                studentsToAdd.map((studentId) => ({
                  studentId,
                  videoId,
                })),
              )
              .orIgnore()
              .execute();
          }

          // 제거 작업
          if (studentsToRemove.length > 0) {
            await studentVideoRepo.delete({
              videoId,
              studentId: In(studentsToRemove),
            });
          }
        }
      }
      // 로그 저장
      await logRepo.save({
        actorId: userIdOfAdmin,
        actorType: 'admin',
        action: 'UPDATE_VIDEO',
        targetType: 'video',
        targetId: videoId,
        description: `Admin updated video (videoId: ${videoId})`,
        createdAt: new Date(),
      });
    });

    // 3. 수정된 영상 정보 반환
    return this.getVideoForAdmin(videoId);
  }

  /**
   * 영상 삭제 (ADMIN만 가능)
   */
  async deleteVideo(videoId: number, userIdOfAdmin: number): Promise<void> {
    const video = await this.videoRepository.findOne({
      where: { videoId },
      select: { bunnyVideoId: true, status: true },
    });

    if (!video) {
      throw new NotFoundException('영상을 찾을 수 없습니다.');
    }

    await this.dataSource.transaction(async (manager) => {
      const videoRepo = manager.getRepository(Video);
      const logRepo = manager.getRepository(ActionLog);
      const studentVideoRepo = manager.getRepository(StudentVideo);

      await studentVideoRepo.delete({ videoId });

      // 상태를 DELETING으로 변경 + Soft Delete
      await videoRepo.update(videoId, {
        status: VideoStatus.DELETING,
      });

      await videoRepo.softDelete(videoId);

      // 로그 저장
      await logRepo.save({
        actorId: userIdOfAdmin,
        actorType: 'admin',
        action: 'DELETE_VIDEO',
        targetType: 'video',
        targetId: videoId,
        description: `Admin deleted video (videoId: ${videoId}, bunnyVideoId: ${video.bunnyVideoId})`,
        createdAt: new Date(),
      });
    });
    this.deleteBunnyVideoAsync(video.bunnyVideoId, videoId);
  }

  /**
   * 학생이 해당 영상에 접근 가능한지 확인
   */
  async canAccessVideo(userId: number, videoId: number): Promise<boolean> {
    const count = await this.studentVideoRepository
      .createQueryBuilder('sv')
      .innerJoin('sv.student', 's')
      .where('s.userId = :userId', { userId })
      .andWhere('sv.videoId = :videoId', { videoId })
      .getCount();

    return count > 0;
  }

  // DTO 변환 메서드들
  private toResponseDto(
    video: Video,
    assignedStudentCount?: number,
  ): VideoResponseDto {
    return {
      videoId: video.videoId,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      status: video.status,
      viewCount: video.viewCount,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      assignedStudentCount,
    };
  }

  private toListResponseDto(video: Video): VideoListResponseDto {
    return {
      videoId: video.videoId,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      status: video.status,
      viewCount: video.viewCount,
      createdAt: video.createdAt,
    };
  }

  /**
   * 비동기 Bunny 영상 삭제
   */
  private async deleteBunnyVideoAsync(
    bunnyVideoId: string,
    videoId: number,
  ): Promise<void> {
    try {
      await this.bunnyService.deleteVideo(bunnyVideoId);

      this.logger.log('Bunny 영상 삭제 성공', {
        videoId,
        bunnyVideoId,
      });

      // ✅ 성공 시 완전 삭제 (선택적)
      // await this.videoRepository.delete(videoId);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Bunny 영상 삭제 실패 (배치에서 재시도)', {
        videoId,
        bunnyVideoId,
        error: errMsg,
      });
      // 실패는 배치 작업에서 처리
    }
  }

  /**
   * 배치: Bunny 영상 객체 정리 (매일 새벽 4시 실행)
   * - DELETING: 삭제 요청 후 Bunny 삭제가 실패한 영상 (soft-deleted)
   * - FAILED:   업로드 실패 후 Bunny 보상 삭제까지 실패한 영상
   */
  @Cron('0 4 * * *')
  async cleanupOrphanBunnyVideos(): Promise<void> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const deletingVideos = await this.videoRepository.find({
      where: {
        status: VideoStatus.DELETING,
        deletedAt: LessThan(oneDayAgo),
      },
      withDeleted: true,
      select: ['videoId', 'bunnyVideoId'],
    });

    const failedVideos = await this.videoRepository.find({
      where: {
        status: VideoStatus.FAILED,
        updatedAt: LessThan(oneDayAgo),
      },
      select: ['videoId', 'bunnyVideoId'],
    });

    this.logger.log(
      `배치 시작: DELETING ${deletingVideos.length}개, FAILED(Bunny 잔존) ${failedVideos.length}개`,
    );

    for (const video of deletingVideos) {
      await this.cleanupBunnyVideo(video.videoId, video.bunnyVideoId, 'DELETING');
    }

    for (const video of failedVideos) {
      await this.cleanupBunnyVideo(video.videoId, video.bunnyVideoId, 'FAILED');
    }

    this.logger.log('배치 완료');
  }

  private async cleanupBunnyVideo(
    videoId: number,
    bunnyVideoId: string,
    label: string,
  ): Promise<void> {
    try {
      await this.bunnyService.deleteVideo(bunnyVideoId);
      this.logger.log(`Bunny 영상 삭제 성공 (배치/${label})`, { videoId, bunnyVideoId });
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 404) {
        this.logger.log(`Bunny에 영상 없음 (이미 삭제됨/${label})`, { videoId, bunnyVideoId });
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Bunny 삭제 재실패 (다음 배치에서 재시도/${label})`, {
          videoId,
          bunnyVideoId,
          error: errMsg,
        });
      }
    }
  }
}
