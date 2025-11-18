import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { MESSAGES } from '../constants/message.constant';
import { UpdateNoticeDto } from './dto/update-notice.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 공지사항 생성
   * @param createNoticeDto
   * @returns
   */
  @Post('/notices')
  async createNotice(@Req() req, @Body() createNoticeDto: CreateNoticeDto) {
    const userId = req.user.userId;
    const notice = await this.adminService.createNotice(
      userId,
      createNoticeDto,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.NOTICE.CREATED,
      data: notice,
    };
  }

  /**
   * 공지사항 전체조회
   * @returns
   */
  @Get('/notices')
  async findAllNotices(@Query('page') page = 1, @Query('limit') limit = 10) {
    const _page = Number(page) || 1;
    const _limit = Math.min(Number(limit) || 10, 50);
    const notices = await this.adminService.findAllNotices({
      page: _page,
      limit: _limit,
    });
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.GET_ALL,
      data: notices,
    };
  }

  /**
   * 공지사항 상세조회
   * @returns
   */
  @Get('/notices/:noticeId')
  async noticeDetail(@Param('noticeId') noticeId: number) {
    const notice = await this.adminService.findNotice(noticeId);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.GET,
      data: notice,
    };
  }

  /**
   * 공지사항 수정
   * @param updateNoticeDto
   * @returns
   */
  @Patch('/notices/:noticeId')
  async updateNotice(
    @Param('noticeId') noticeId: number,
    @Body() updateNoticeDto: UpdateNoticeDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    const updatedNotice = await this.adminService.updateNotice(
      userId,
      noticeId,
      updateNoticeDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.UPDATED,
      data: updatedNotice,
    };
  }
}
