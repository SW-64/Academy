import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { VideosService } from './videos.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import { CreateVideoDto } from './dto/create-video.dto';
import { MESSAGES } from './../constants/message.constant';
import { VideoAccessGuard } from '../auth/guards/video-access.guard';
import { PartialUser } from './../users/interfaces/partial-user.entity';
import { UserInfo } from './../util/decorators/user-info.decorator';
import { UpdateVideoDto } from './dto/update-video.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  /**
   * 영상 업로드 (ADMIN만 가능)
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() createVideoDto: CreateVideoDto,
    @UserInfo() admin: PartialUser,
  ) {
    const data = await this.videosService.uploadVideo(
      createVideoDto,
      file,
      admin.userId,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.VIDEO.SUCCESS.UPLOAD,
      data: data,
    };
  }

  /**
   * 영상 목록 조회
   * - ADMIN: 전체 영상 목록
   * - STUDENT: 자신에게 할당된 영상만
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STUDENT)
  @Get()
  async getVideos(
    @UserInfo() user: PartialUser,
    @Query() pagination: PaginationDto,
  ) {
    let data;

    if (user.role === Role.ADMIN) {
      data = await this.videosService.getAllVideos(pagination);
    } else {
      data = await this.videosService.getMyVideos(user.userId, pagination);
    }

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.VIDEO.SUCCESS.LIST,
      data: data,
    };
  }

  /**
   * 영상 재생 URL 조회 (ADMIN, 수강 중인 STUDENT)
   * 학생 기준 엔드포인트
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, VideoAccessGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @Get('/:videoId/playback')
  async getPlaybackUrl(
    @Param('videoId', ParseIntPipe) videoId: number,
    @UserInfo() user: PartialUser,
  ) {
    const data = await this.videosService.getPlaybackUrl(videoId, user.userId);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.VIDEO.SUCCESS.PLAYBACK,
      data: data,
    };
  }

  /**
   * 영상 상세 조회 (역할별로 다른 정보 반환)
   * - STUDENT: title, 썸네일만
   * - ADMIN: title, 썸네일, 할당된 학생 목록
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, VideoAccessGuard)
  @Roles(Role.ADMIN, Role.STUDENT)
  @Get(':videoId')
  async getVideo(
    @Param('videoId', ParseIntPipe) videoId: number,
    @UserInfo() user: PartialUser,
  ) {
    let data;

    if (user.role === Role.ADMIN) {
      data = await this.videosService.getVideoForAdmin(videoId);
    } else {
      data = await this.videosService.getVideoForStudent(videoId);
    }

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.VIDEO.SUCCESS.ONE,
      data: data,
    };
  }

  /**
   * 영상 정보 수정 (ADMIN만 가능)
   * - 제목 수정
   * - 할당 학생 수정 (전체 목록)
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':videoId')
  async updateVideo(
    @Param('videoId', ParseIntPipe) videoId: number,
    @Body() updateVideoDto: UpdateVideoDto,
    @UserInfo() admin: PartialUser,
  ) {
    const data = await this.videosService.updateVideo(
      videoId,
      updateVideoDto,
      admin.userId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.VIDEO.SUCCESS.UPDATE,
      data: data,
    };
  }

  /**
   * 영상 삭제 (ADMIN만 가능)
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':videoId')
  async deleteVideo(
    @Param('videoId', ParseIntPipe) videoId: number,
    @UserInfo() admin: PartialUser,
  ) {
    await this.videosService.deleteVideo(videoId, admin.userId);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.VIDEO.SUCCESS.DELETE,
    };
  }

  /**
   * 삭제 실패 영상 정리 (배치)
   * ADMIN만 수동 실행 가능 (또는 CRON)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('cleanup')
  async cleanupDeletedVideos() {
    await this.videosService.cleanupOrphanBunnyVideos();

    return {
      statusCode: HttpStatus.OK,
      message: '삭제 실패 영상 정리 완료',
    };
  }
}
