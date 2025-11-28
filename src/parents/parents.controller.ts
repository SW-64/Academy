import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ParentsService } from './parents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Parent } from './entities/parent.entity';
import { Role } from '../users/entities/user.entity';
import { UserInfo } from './../util/decorators/user-info.decorator';
import { PartialUser } from './../users/interfaces/partial-user.entity';
import { MESSAGES } from '../constants/message.constant';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  // 자녀조회
  @Get('/students')
  async findMyStudents(@Req() req) {
    const userId = req.user.id;
    const parentId = await this.parentsService.getParentByUserId(userId);
    const students = await this.parentsService.getMyStudents(parentId);
    return students;
  }

  // 자녀 추가( 연동 요청 )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT)
  @Post('/requests')
  async createStudentLinkRequest(@UserInfo() user: PartialUser) {
    const data = await this.parentsService.createStudentLinkRequest(
      user.userId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.PARENTS.STUDENT_LINK.REQUESTED,
      data: data,
    };
  }
}
