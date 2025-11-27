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
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { MESSAGES } from '../constants/message.constant';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { Role, User } from '../users/entities/user.entity';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PartialUser } from '../users/interfaces/partial-user.entity';
import { CreateGradeDto } from './dto/create-grades.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 공지사항 생성
   * @param createNoticeDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/notices')
  async createNotice(
    @UserInfo() user: PartialUser,
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
  @UseGuards(JwtAuthGuard)
  @Get('/notices')
  async getNoticesAll(@Query('page') page = 1, @Query('limit') limit = 10) {
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
  @UseGuards(JwtAuthGuard)
  @Get('/notices/:noticeId')
  async getNoticeOne(@Param('noticeId') noticeId: number) {
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/notices/:noticeId')
  async updateNotice(
    @Param('noticeId') noticeId: number,
    @Body() updateNoticeDto: UpdateNoticeDto,
  ) {
    const data = await this.adminService.updateNotice(
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('/notices/:noticeId')
  async deleteNotice(@Param('noticeId') noticeId: number) {
    await this.adminService.deleteNotice(noticeId);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/exams')
  async createExam(
    @UserInfo() user: PartialUser,
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
  @UseGuards(JwtAuthGuard)
  @Get('/exams')
  async getExamsAll(@Query('page') page = 1, @Query('limit') limit = 10) {
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
  @UseGuards(JwtAuthGuard)
  @Get('/exams/:examId')
  async getExamOne(@Param('examId') examId: number) {
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/exams/:examId')
  async updateExam(
    @Param('examId') examId: number,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    const data = await this.adminService.updateExam(examId, updateExamDto);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('/exams/:examId')
  async deleteExam(@Param('examId') examId: number) {
    await this.adminService.deleteExam(examId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.DELETE,
    };
  }

  /**
   * 학생 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/students')
  async getAllStudents(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    const _page = Number(page) || 1;
    const _limit = Math.min(Number(limit) || 10, 50);
    const data = await this.adminService.findAllStudents(
      {
        page: _page,
        limit: _limit,
      },
      status,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.STUDENT.GET.ALL,
      data: data,
    };
  }

  /**
   * 학생 상세 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/students/:studentId')
  async getStudent(@Param('studentId') studentId: number) {
    const data = await this.adminService.findOneStudent(studentId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.STUDENT.GET.ONE,
      data: data,
    };
  }

  /**
   * 학부모 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/parents')
  async getAllParents(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    const _page = Number(page) || 1;
    const _limit = Math.min(Number(limit) || 10, 50);
    const data = await this.adminService.findAllParents(
      {
        page: _page,
        limit: _limit,
      },
      status,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.PARENT.GET.ALL,
      data: data,
    };
  }

  /**
   * 학부모 상세 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/parents/:parentId')
  async getParent(@Param('parentId') parentId: number) {
    const data = await this.adminService.findOneParent(parentId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.PARENT.GET.ONE,
      data: data,
    };
  }

  /**
   * 유저 계정 승인
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/users/:userId/approve')
  async approveUserAccount(@Param('userId') userId: number) {
    await this.adminService.approveUserAccount(userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.ACCOUNT.UPDATE.APPROVE,
    };
  }

  /**
   * 유저 계정 거절
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/users/:userId/reject')
  async rejectUserAccount(@Param('userId') userId: number) {
    await this.adminService.rejectUserAccount(userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.ACCOUNT.UPDATE.REJECT,
    };
  }

  /**
   * 시험점수 생성
   * @param CreateGradeDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/exams/:examId/grades')
  async createGrade(
    @UserInfo() user: PartialUser,
    @Param('examId') examId: number,
    @Body()
    createGradeDto: CreateGradeDto,
  ) {
    const data = await this.adminService.createGrade(examId, createGradeDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.GRADE.CREATE.OK,
      data: data,
    };
  }
}
