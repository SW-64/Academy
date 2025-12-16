import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParentsService } from './parents.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/entities/user.entity';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { PartialUser } from '../users/interfaces/partial-user.entity';

import { MESSAGES } from './../constants/message.constant';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  // 자녀조회
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT)
  @Get('/students')
  async getMyStudents(@UserInfo() user: PartialUser) {
    const userId = user.userId;
    const students = await this.parentsService.getMyStudents(userId);
    return students;
  }

  /**
   * 학부모 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/parents')
  async getAllParents(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const data = await this.parentsService.findAllParents(
      {
        page: _page,
        limit: _limit,
      },
      status,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.PARENT.SUCCESS.LIST,
      data: data,
    };
  }

  /**
   * 학부모 상세 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/parents/:parentId')
  async getParent(@Param('parentId', ParseIntPipe) parentId: number) {
    const data = await this.parentsService.findOneParent(parentId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.PARENT.SUCCESS.GET,
      data: data,
    };
  }
}
