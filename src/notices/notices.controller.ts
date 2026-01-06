import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { MESSAGES } from '../constants/message.constant';

import { UserInfo } from '../util/decorators/user-info.decorator';
import { Role } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PartialUser } from '../users/interfaces/partial-user.entity';

import { NoticesService } from './notices.service';

import { UpdateNoticeDto } from '../notices/dto/update-notice.dto';
import { CreateNoticeDto } from '../notices/dto/create-notice.dto';

@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  /**
   * 공지사항 생성
   * @param createNoticeDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('')
  async createNotice(
    @UserInfo() user: PartialUser,
    @Body() createNoticeDto: CreateNoticeDto,
  ) {
    const userId = user.userId;
    const data = await this.noticesService.createNotice(
      userId,
      createNoticeDto,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.NOTICE.SUCCESS.CREATE,
      data: data,
    };
  }

  /**
   * 공지사항 전체조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PARENT, Role.STUDENT)
  @Get('')
  async getNoticesAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    const _page = Number(page) || 1;
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const data = await this.noticesService.findAllNotices({
      page: _page,
      limit: _limit,
    });
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.SUCCESS.LIST,
      data: data,
    };
  }

  /**
   * 고정 공지사항 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard)
  @Get('/pinned')
  async getPinnedNotices() {
    const data = await this.noticesService.findPinnedNotices();

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.SUCCESS.PINNED_LIST,
      data: data,
    };
  }

  /**
   * 공지사항 상세조회
   * @returns
   */
  @UseGuards(JwtAuthGuard)
  @Get('/:noticeId')
  async getNoticeOne(@Param('noticeId', ParseIntPipe) noticeId: number) {
    const data = await this.noticesService.findNotice(noticeId);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.SUCCESS.GET,
      data: data,
    };
  }

  /**
   * 공지사항 수정
   * @param updateNoticeDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/:noticeId')
  async updateNotice(
    @Param('noticeId', ParseIntPipe) noticeId: number,
    @Body() updateNoticeDto: UpdateNoticeDto,
    @UserInfo() admin: PartialUser,
  ) {
    await this.noticesService.updateNotice(
      noticeId,
      updateNoticeDto,
      admin.userId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.SUCCESS.UPDATE,
    };
  }

  /**
   * 공지사항 삭제
   * @returns
   *
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('/:noticeId')
  async deleteNotice(
    @Param('noticeId', ParseIntPipe) noticeId: number,
    @UserInfo() admin: PartialUser,
  ) {
    await this.noticesService.deleteNotice(noticeId, admin.userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.SUCCESS.DELETE,
    };
  }
}
