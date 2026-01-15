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
import { StudentOrParentOwnsStudentGuard } from './../auth/guards/student-or-parent-owns-student.guard';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { PartialUser } from './../users/interfaces/partial-user.entity';
import { MaterialsService } from 'src/materials/materials.service';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly materialsService: MaterialsService,
  ) {}

  /**
   * 학생이 받을 수 있는 학습자료 목록 조회
   * - 내 반에 배포된 자료만
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('/materials')
  async getStudentMaterials(
    @UserInfo() user: PartialUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sort') sort?: string,
    @Query('classId') classId?: string,
  ) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const sortOption = sort === 'title_asc' ? 'title_asc' : 'created_desc';
    const classIdNumber = classId ? Math.max(Number(classId) || 0, 0) : null;

    const data = await this.materialsService.getStudentMaterials(
      user.userId,
      { page: _page, limit: _limit },
      sortOption,
      classIdNumber,
    );

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.MATERIAL.SUCCESS.LIST,
      data,
    };
  }

  /**
   * 성적 현황 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, StudentOrParentOwnsStudentGuard)
  @Roles(Role.STUDENT, Role.PARENT)
  @Get('/:studentId/grades/summary')
  async getCurrentGrades(@Param('studentId', ParseIntPipe) studentId: number) {
    const data = await this.studentsService.getCurrentGrades(studentId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENTS.GRADE.SUCCESS.SUMMARY,
      data: data,
    };
  }
  /**
   * 성적 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, StudentOrParentOwnsStudentGuard)
  @Roles(Role.STUDENT, Role.PARENT)
  @Get('/:studentId/grades')
  async getAllGrades(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('year') year?: string,
    @Query('month') month?: string, //한 페이지에 보여줄 갯수
  ) {
    const now = new Date();
    const _year = year ? Number(year) : now.getFullYear();
    const _month = month ? Number(month) : now.getMonth() + 1;
    // 월 범위 방어(1~12)
    const safeMonth = Math.min(Math.max(_month || 1, 1), 12);
    const safeYear = Math.max(_year || now.getFullYear(), 1970);
    const data = await this.studentsService.getAllGrades(
      studentId,
      safeYear,
      safeMonth,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENTS.GRADE.SUCCESS.LIST,
      data: data,
    };
  }

  /**
   * 성적 상세 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, StudentOrParentOwnsStudentGuard)
  @Roles(Role.STUDENT, Role.PARENT)
  @Get('/:studentId/grades/:gradeId')
  async getOneGrade(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('gradeId', ParseIntPipe) gradeId: number,
  ) {
    const data = await this.studentsService.getOneGrade(studentId, gradeId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENTS.GRADE.SUCCESS.ONE,
      data: data,
    };
  }

  /**
   * 학생 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async getAllStudents(@Query('page') page = 1, @Query('limit') limit = 10) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const data = await this.studentsService.findAllStudents({
      page: _page,
      limit: _limit,
    });
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.STUDENT.SUCCESS.LIST,
      data: data,
    };
  }

  /**
   * 학생 상세 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/:studentId')
  async getStudent(@Param('studentId', ParseIntPipe) studentId: number) {
    const data = await this.studentsService.findOneStudent(studentId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.STUDENT.SUCCESS.GET,
      data: data,
    };
  }

  /**
   * 학생 홈화면 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('/home')
  async getStudentHome(@UserInfo() user: PartialUser) {
    const userId = user.userId;
    const data = await this.studentsService.getStudentHome(userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENTS.HOME.SUCCESS.GET,
      data: data,
    };
  }

  /**
   * 학생용 학습자료 다운로드 URL 발급
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('/materials/:materialId/download-url')
  async getStudentMaterialDownloadUrl(
    @Param('materialId', ParseIntPipe) materialId: number,
    @UserInfo() user: PartialUser,
  ) {
    const data = await this.materialsService.getStudentMaterialDownloadUrl(
      materialId,
      user.userId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.MATERIAL.SUCCESS.DOWNLOAD_URL,
      data,
    };
  }
}
