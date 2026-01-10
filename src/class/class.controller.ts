import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ClassService } from './class.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { MESSAGES } from './../constants/message.constant';

@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  /**
   * 클래스의 교재 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/:classId/textbooks')
  async getAllTextbookOfClass(@Param('classId', ParseIntPipe) classId: number) {
    const data = await this.classService.getAllTextbooksOfClass(classId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.TEXTBOOK.SUCCESS.GET_ALL_OF_CLASS,
      data: data,
    };
  }
}
