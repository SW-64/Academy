import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { MESSAGES } from './../constants/message.constant';
import { BulkUpdateProgressCellsDto } from './dto/bulk-update-progress-cells.dto';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { PartialUser } from '../users/interfaces/partial-user.entity';
import { ClassAccessGuard } from './../auth/guards/class-acces.guard';

@Controller('')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  /**
   * 숙제 진도 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard, ClassAccessGuard)
  @Roles(Role.ADMIN)
  @Get('/classes/:classId/textbooks/:textbookId/progress-grid')
  async getHomeworkProgress(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('textbookId', ParseIntPipe) textbookId: number,
  ) {
    const data = await this.homeworkService.getHomeworkProgress(
      classId,
      textbookId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.HOMEWORK.SUCCESS.GET_PROGRESS,
      data: data,
    };
  }

  /**
   * 숙제 진도 수정
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/classes/:classId/textbooks/:textbookId/progress-cells')
  async updateHomeworkProgress(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('textbookId', ParseIntPipe) textbookId: number,
    @Body() updateDto: BulkUpdateProgressCellsDto,
  ) {
    const data = await this.homeworkService.updateHomeworkProgress(
      classId,
      textbookId,
      updateDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.HOMEWORK.SUCCESS.UPDATE_PROGRESS,
      data: data,
    };
  }

  /**
   * 학생 본인의 숙제 진도 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('/students/me/classes/:classId/textbooks/:textbookId/homework')
  async getMyHomeworkProgress(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('textbookId', ParseIntPipe) textbookId: number,
    @UserInfo() user: PartialUser,
  ) {
    const data = await this.homeworkService.getMyHomeworkProgress(
      classId,
      textbookId,
      user.userId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.STUDENTS.HOMEWORK.SUCCESS.GET_PROGRESS,
      data: data,
    };
  }

  /**
   * 내 자녀의 숙제 진도 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT)
  @Get(
    '/parents/me/students/:studentId/classes/:classId/textbooks/:textbookId/homework',
  )
  async getMyChildHomeworkProgress(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('textbookId', ParseIntPipe) textbookId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @UserInfo() user: PartialUser,
  ) {
    const data = await this.homeworkService.getMyChildHomeworkProgress(
      user.userId,
      studentId,
      classId,
      textbookId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.PARENTS.HOMEWORK.SUCCESS.GET_MY_CHILD_PROGRESS,
      data: data,
    };
  }
}
