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
import { UserInfo } from '../util/decorators/user-info.decorator';
import { User } from '../users/entities/user.entity';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 공지사항 생성
   * @param createNoticeDto
   * @returns
   */
  @Post('/notices')
  async createNotice(
    @UserInfo() user: User,
    @Body() createNoticeDto: CreateNoticeDto,
  ) {
    const userId = user.userId;
    const data = await this.adminService.createNotice(userId, createNoticeDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.NOTICE.CREATED,
      data: data,
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
    const data = await this.adminService.findAllNotices({
      page: _page,
      limit: _limit,
    });
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.GET_ALL,
      data: data,
    };
  }

  /**
   * 공지사항 상세조회
   * @returns
   */
  @Get('/notices/:noticeId')
  async noticeDetail(@Param('noticeId') noticeId: number) {
    const data = await this.adminService.findNotice(noticeId);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.GET,
      data: data,
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
    @UserInfo() user: User,
  ) {
    const userId = user.userId;
    const data = await this.adminService.updateNotice(
      userId,
      noticeId,
      updateNoticeDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.UPDATED,
      data: data,
    };
  }

  /**
   * 공지사항 삭제
   * @returns
   *
   */
  @Delete('/notices/:noticeId')
  async deleteNotice(
    @Param('noticeId') noticeId: number,
    @UserInfo() user: User,
  ) {
    const userId = user.userId;
    await this.adminService.deleteNotice(userId, noticeId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.NOTICE.DELETED,
    };
  }

  /**
   * 시험일정 생성
   * @param createExamDto
   * @returns
   */
  @Post('/exams')
  async creatExam(
    @UserInfo() user: User,
    @Body() createExamDto: CreateExamDto,
  ) {
    const userId = user.userId;
    const data = await this.adminService.createExam(userId, createExamDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.EXAM.CREATE.OK,
      data: data,
    };
  }

  /**
   * 시험일정 전체조회
   * @returns
   */
  @Get('/exams')
  async getAllExams(@Query('page') page = 1, @Query('limit') limit = 10) {
    const _page = Number(page) || 1;
    const _limit = Math.min(Number(limit) || 10, 50);
    const data = await this.adminService.findAllExams({
      page: _page,
      limit: _limit,
    });
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.GET.ALL,
      data: data,
    };
  }

  /**
   * 시험일정 상세조회
   * @returns
   */
  @Get('/exams/:examId')
  async getExam(@Param('examId') examId: number) {
    const data = await this.adminService.findExam(examId);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.GET.ONE,
      date: data,
    };
  }

  /**
   * 시험일정 수정
   * @param updateExamDto
   * @returns
   */
  @Patch('/exams/:examId')
  async updateExam(
    @Param('examId') examId: number,
    @Body() updateExamDto: UpdateExamDto,
    @UserInfo() user: User,
  ) {
    const userId = user.userId;
    const data = await this.adminService.updateExam(
      userId,
      examId,
      updateExamDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.UPDATE.OK,
      data: data,
    };
  }

  /**
   * 시험일정 삭제
   * @returns
   */
  @Delete('/exams/:examId')
  async deleteExam(@Param('examId') examId: number, @UserInfo() user: User) {
    const userId = user.userId;
    await this.adminService.deleteExam(userId, examId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.DELETE,
    };
  }
}
