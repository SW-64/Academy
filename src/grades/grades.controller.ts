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
import { GradesService } from './grades.service';

import { MESSAGES } from '../constants/message.constant';

import { UserInfo } from '../util/decorators/user-info.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { Role } from '../users/entities/user.entity';
import { PartialUser } from '../users/interfaces/partial-user.entity';

import { CreateGradeDto } from './dto/create-grades.dto';
import { UpdateGradeDto } from './dto/update-grades.dto';

@Controller('admin')
export class GradesController {
  constructor(private readonly gradeService: GradesService) {}

  /**
   * 시험점수 생성
   * @param CreateGradeDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/exams/:examId/grades')
  async createGrade(
    @Param('examId', ParseIntPipe) examId: number,
    @Body()
    createGradeDto: CreateGradeDto,
  ) {
    const data = await this.gradeService.createGrade(examId, createGradeDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.ADMIN.GRADE.CREATE.OK,
      data: data,
    };
  }

  /**
   * 시험점수 전체조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/exams/:examId/grades')
  async getAllGrades(
    @Param('examId', ParseIntPipe) examId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const data = await this.gradeService.getAllGrades(examId, {
      page: _page,
      limit: _limit,
    });
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.GRADE.GET.ALL,
      data: data,
    };
  }

  /**
   * 시험점수 상세조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/exams/:examId/grades/:gradeId')
  async getGrade(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('gradeId', ParseIntPipe) gradeId: number,
  ) {
    const data = await this.gradeService.getGrade(examId, gradeId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.GRADE.GET.ONE,
      data: data,
    };
  }

  /**
   * 시험점수 수정
   * @param updateGradeDto
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/exams/:examId/grades/:gradeId')
  async updateGrade(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('gradeId', ParseIntPipe) gradeId: number,
    @Body() updateGradeDto: UpdateGradeDto,
  ) {
    await this.gradeService.updateGrade(examId, gradeId, updateGradeDto);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.GRADE.UPDATE.OK,
    };
  }

  /**
   * 시험점수 삭제
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('/exams/:examId/grades/:gradeId')
  async deleteGrade(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('gradeId', ParseIntPipe) gradeId: number,
  ) {
    await this.gradeService.deleteGrade(examId, gradeId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.GRADE.DELETE,
    };
  }
}
