import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { MESSAGES } from './../constants/message.constant';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}
  /**
   * 성적 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.PARENT)
  @Get('/:studentId/grades')
  async getAllGrades(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('year') year,
    @Query('month') month, //한 페이지에 보여줄 갯수
  ) {
    const _year = Number(year) || 2026;
    const _month = Number(month) || 1;

    const grades = await this.studentsService.getAllGrades(
      studentId,
      _year,
      _month,
    );
    return grades;
  }

  /**
   * 성적 상세 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.PARENT)
  @Get('/:studentId/grades/:gradeId')
  async getOneGrade(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('gradeId', ParseIntPipe) gradeId: number,
  ) {
    const grade = await this.studentsService.getOneGrade(studentId, gradeId);
    return grade;
  }

  /**
   * 성적 현황 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('/:studentId/grades/summary')
  async getCurrentGrades(@Param('studentId', ParseIntPipe) studentId: number) {
    const data = await this.studentsService.getCurrentGrades(studentId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENTS.GRADE.SUMMARY.SUCCEED,
      data: data,
    };
  }
}
