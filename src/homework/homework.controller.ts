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

@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  /**
   * 숙제 진도 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/class/:classId/textbooks/:textbookId/progress-grid')
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
  @Patch('/class/:classId/textbooks/:textbookId/progress-cells')
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
}
