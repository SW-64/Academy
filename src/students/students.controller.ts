import {
  Controller,
  Get,
  Param,
  Req,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  //성적 목록 조회
  @Get('/:studentId/grades')
  async getGrades(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10, //한 페이지에 보여줄 갯수
    @Req() req,
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
  @Get('/:studentId/grades/:gradeId')
  async getGradeDetail(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('gradeId', ParseIntPipe) gradeId: number,
    @Req() req,
  ) {
    // const userId = req.user.userId;
    const grade = await this.studentsService.getGardeDetail(studentId, gradeId);
    return grade;
  }
}
