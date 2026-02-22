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
import { StudentsService } from '../students/students.service';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}
  /**
   * 학부모 검색
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/search')
  async searchParents(
    @Query('name') name?: string,
    @Query('phone') phone?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    console.log(name);
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const data = await this.parentsService.searchParents(
      name,
      phone,
      _page,
      _limit,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.PARENTS.SEARCH.SUCCESS,
      data: data,
    };
  }
  // 자녀조회
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT)
  @Get('/me/students')
  async getMyStudents(@UserInfo() user: PartialUser) {
    const userId = user.userId;
    const data = await this.parentsService.getMyStudents(userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.PARENTS.SUCCESS.LIST,
      data: data,
    };
  }

  /**
   * 학부모 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('')
  async getAllParents(@Query('page') page = 1, @Query('limit') limit = 10) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const data = await this.parentsService.findAllParents({
      page: _page,
      limit: _limit,
    });
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
  @Get('/:parentId')
  async getParent(@Param('parentId', ParseIntPipe) parentId: number) {
    const data = await this.parentsService.findOneParent(parentId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.PARENT.SUCCESS.GET,
      data: data,
    };
  }

  /**
   * 자녀 클래스 전체 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PARENT)
  @Get('/me/students/:studentId/classes')
  async getMyChildClasses(
    @UserInfo() user: PartialUser,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    const data = await this.parentsService.getMyChildClasses(
      user.userId,
      studentId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.PARENTS.CLASS.SUCCESS.GET_MY_CHILD_CLASSES,
      data: data,
    };
  }
}
