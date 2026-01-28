import {
  Controller,
  Get,
  Param,
  HttpStatus,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { GradesService } from './grades.service';

import { MESSAGES } from '../constants/message.constant';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { ClassAccessGuard } from './../auth/guards/class-acces.guard';
import { UserInfo } from './../util/decorators/user-info.decorator';
import { PartialUser } from './../users/interfaces/partial-user.entity';

@Controller('')
export class GradesController {
  constructor(private readonly gradeService: GradesService) {}

  /**
   * 학생 본인 시험점수 전체조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, ClassAccessGuard)
  @Roles(Role.STUDENT)
  @Get('classes/:classId/exams/grades/me')
  async getMyGrades(
    @Param('classId', ParseIntPipe) classId: number,
    @UserInfo() student: PartialUser,
    @Query('sort') sort?: string,
  ) {
    // 정렬방식 지정
    // score_desc = 점수 내림차순
    // name_asc = 이름 오름차순
    const sortOption = sort === 'score_desc' ? 'score_desc' : 'name_asc';
    const data = await this.gradeService.getStudentGrade(
      classId,
      student.userId,
      sortOption,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENTS.GRADE.SUCCESS.GET_LIST,
      data: data,
    };
  }

  /**
   * 자녀의 시험점수 전체조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, ClassAccessGuard)
  @Roles(Role.PARENT)
  @Get('classes/:classId/exams/grades/my-students/:studentId')
  async getMyStudentGrades(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @UserInfo() parent: PartialUser,
    @Query('sort') sort?: string,
  ) {
    // 정렬방식 지정
    // score_desc = 점수 내림차순
    // name_asc = 이름 오름차순
    const sortOption = sort === 'score_desc' ? 'score_desc' : 'name_asc';
    const data = await this.gradeService.getStudentGradeByParent(
      classId,
      parent.userId,
      studentId,
      sortOption,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.PARENTS.GRADE.SUCCESS.GET_LIST,
      data: data,
    };
  }

  // /**
  //  * 시험점수 상세조회
  //  * @returns
  //  */
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.ADMIN)
  // @Get('/exams/:examId/grades/:gradeId')
  // async getGrade(
  //   @Param('examId', ParseIntPipe) examId: number,
  //   @Param('gradeId', ParseIntPipe) gradeId: number,
  // ) {
  //   const data = await this.gradeService.getGrade(examId, gradeId);
  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: MESSAGES.ADMIN.GRADE.SUCCESS.GET,
  //     data: data,
  //   };
  // }

  /**
   * 학생 본인 시험 등수 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, ClassAccessGuard)
  @Roles(Role.STUDENT)
  @Get('classes/:classId/exams/:examId/rank/me')
  async getMyRank(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('examId', ParseIntPipe) examId: number,
    @UserInfo() student: PartialUser,
  ) {
    const data = await this.gradeService.getMyRank(
      classId,
      examId,
      student.userId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENTS.GRADE.SUCCESS.GET_MY_RANK,
      data: data,
    };
  }

  /**
   * 학부모 - 자녀의 시험 등수 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, ClassAccessGuard)
  @Roles(Role.PARENT)
  @Get('classes/:classId/exams/:examId/rank/my-student/:studentId')
  async getMyStudentRank(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('examId', ParseIntPipe) examId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @UserInfo() parent: PartialUser,
  ) {
    const data = await this.gradeService.getMyStudentRank(
      classId,
      examId,
      parent.userId,
      studentId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.PARENTS.GRADE.SUCCESS.GET_STUDENT_RANK,
      data: data,
    };
  }
}
