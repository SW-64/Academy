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
import { ReplaceWrongAnswersDto } from './dto/wrong-answer-patch.dto';

@Controller('classes/:classId/exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}
  /**
   * 시험일정 생성
   * @param createExamDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async createExam(
    @UserInfo() admin: PartialUser,
    @Body() createExamDto: CreateExamDto,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    const data = await this.examService.createExam(
      createExamDto,
      admin.userId,
      classId,
    );
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
  @Get()
  async getExamsAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const data = await this.examService.findAllExams(classId, {
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
  @Get('/:examId')
  async getExamOne(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    const data = await this.examService.findExam(examId, classId);

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
  @Patch('/:examId')
  async updateExam(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('examId', ParseIntPipe) examId: number,
    @Body() updateExamDto: UpdateExamDto,
    @UserInfo() admin: PartialUser,
  ) {
    await this.examService.updateExam(
      examId,
      updateExamDto,
      admin.userId,
      classId,
    );
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
  @Delete('/:examId')
  async deleteExam(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('examId', ParseIntPipe) examId: number,
    @UserInfo() admin: PartialUser,
  ) {
    await this.examService.deleteExam(examId, admin.userId, classId);
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
  @Post('/:examId/average')
  async createExamAverage(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('examId', ParseIntPipe) examId: number,
    @UserInfo() admin: PartialUser,
  ) {
    const data = await this.examService.createExamAverage(
      examId,
      admin.userId,
      classId,
    );
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
  @Get('/:examId/wrong-answers')
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
   * 시험 오답 수정
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/:examId/wrong-answers')
  async updateExamWrongAnswers(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: ReplaceWrongAnswersDto,
    @UserInfo() admin: PartialUser,
  ) {
    await this.examService.updateExamWrongAnswers(
      examId,
      classId,
      dto,
      admin.userId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.UPDATE_WRONG_ANSWERS,
    };
  }

  /**
   * 시험 오답률 계산
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/:examId/error-rates')
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
  @Get('/:examId/error-rates')
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
  @Post(':examId/rankings')
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
  @Get('/:examId/rankings')
  async getRankings(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    const data = await this.examService.getExamRankings(examId, classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.EXAM.SUCCESS.GET_RANKINGS,
      data: data,
    };
  }

  /**
   * 시험
   * @returns
   */
}
