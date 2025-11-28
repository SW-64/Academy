import {
  Controller,
  Get,
  Param,
  Req,
  ParseIntPipe,
  Query,
  Post,
  UseGuards,
  Body,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import { RolesGuard } from './../auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/users/entities/user.entity';
import { MESSAGES } from './../constants/message.constant';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { PartialUser } from './../users/interfaces/partial-user.entity';

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

  // 부모 연동 연결
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Post('/link')
  async linkParent(@Body('code') code: string, @UserInfo() user: PartialUser) {
    const userId = user.userId;
    await this.studentsService.linkParentByCode(code, userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENT.PARENT_LINK.SUCCEED,
    };
  }

  // 부모 연동 해제
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Delete('/linked-parents/:parentId')
  async unlinkParent(
    @Param('parentId', ParseIntPipe) parentId: number,
    @UserInfo() user: PartialUser,
  ) {
    const userId = user.userId;
    await this.studentsService.unlinkParentById(parentId, userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENT.PARENT_LINK.UNLINKED,
    };
  }
}
