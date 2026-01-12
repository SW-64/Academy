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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { PartialUser } from '../users/interfaces/partial-user.entity';
import { Role } from '../users/entities/user.entity';

import { ExamService } from './exam.service';

import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Controller('')
export class ExamController {
  constructor(private readonly examService: ExamService) {}
  /**
   * 시험일정 생성
   * @param createExamDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('exams')
  async createExam(
    @UserInfo() admin: PartialUser,
    @Body() createExamDto: CreateExamDto,
  ) {
    const data = await this.examService.createExam(createExamDto, admin.userId);
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.CREATE,
      data: data,
    };
  }

  /**
   * 시험일정 전체조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('exams')
  async getExamsAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const data = await this.examService.findAllExams({
      page: _page,
      limit: _limit,
    });
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.LIST,
      data: data,
    };
  }

  /**
   * 시험일정 상세조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('exams/:examId')
  async getExamOne(@Param('examId', ParseIntPipe) examId: number) {
    const data = await this.examService.findExam(examId);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.GET,
      data: data,
    };
  }

  /**
   * 시험일정 수정
   * @param updateExamDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('exams/:examId')
  async updateExam(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() updateExamDto: UpdateExamDto,
    @UserInfo() admin: PartialUser,
  ) {
    await this.examService.updateExam(examId, updateExamDto, admin.userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.UPDATE,
    };
  }

  /**
   * 시험일정 삭제
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('exams/:examId')
  async deleteExam(
    @Param('examId', ParseIntPipe) examId: number,
    @UserInfo() admin: PartialUser,
  ) {
    await this.examService.deleteExam(examId, admin.userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.DELETE,
    };
  }

  /**
   * 전체 학생 평균 생성
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('exams/:examId/average')
  async createExamAverage(
    @Param('examId', ParseIntPipe) examId: number,
    @UserInfo() admin: PartialUser,
  ) {
    const data = await this.examService.createExamAverage(examId, admin.userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.CREATE_EXAM_AVERAGE,
      data: data,
    };
  }

  /**
   * 시험 오답 확인
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/classes/:classId/exams/:examId/wrong-answers')
  async getExamWrongAnswers(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    const data = await this.examService.getExamWrongAnswers(examId, classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.GET_WRONG_ANSWERS,
      data,
    };
  }

  /**
   * 시험 오답률 계산
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/classes/:classId/exams/:examId/error-rates')
  async calculateExamErrorRates(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    const data = await this.examService.calculateExamErrorRates(
      examId,
      classId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.CALCULATE_ERROR_RATES,
      data,
    };
  }

  /**
   * 시험 오답률 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/classes/:classId/exams/:examId/error-rates')
  async getExamErrorRates(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    const data = await this.examService.getExamErrorRates(examId, classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.GET_ERROR_RATES,
      data,
    };
  }

  /**
   * 시험 등수 계산
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/classes/:classId/exams/:examId/rankings')
  async calculateRankings(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    await this.examService.calculateExamRankings(examId, classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.CALCULATE_RANKINGS,
    };
  }

  /**
   * 시험 등수 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/classes/:classId/exams/:examId/rankings')
  getRankings(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    const data = this.examService.getExamRankings(examId, classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.GET_RANKINGS,
      data,
    };
  }
}
