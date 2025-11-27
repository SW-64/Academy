import {
  Controller,
  Get,
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

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  //성적 목록 조회
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.PARENT)
  @Get('/:studentId/grades')
  async getAllGrades(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10, //한 페이지에 보여줄 갯수
  ) {
    const _page = Number(page) || 1;
    const _limit = Math.min(Number(limit) || 10, 50);

    const grades = await this.studentsService.getGardes(studentId, {
      page: _page,
      limit: _limit,
    });
    return grades;
  }

  //성적 상세 조회
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.PARENT)
  @Get('/:studentId/grades/:gradeId')
  async getGrade(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('gradeId', ParseIntPipe) gradeId: number,
  ) {
    const grade = await this.studentsService.getGardeDetail(studentId, gradeId);
    return grade;
  }
}
