import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';

import { MESSAGES } from './../constants/message.constant';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { Role } from './entities/user.entity';
import { PartialUser } from './interfaces/partial-user.entity';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 내 정보 조회
   */
  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async getMyInfo(@UserInfo() user: PartialUser) {
    const userId = user.userId;
    const data = await this.usersService.getMyInfo(userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.SUCCESS.USER_INFO,
      data: data,
    };
  }

  /**
   * 내 정보 수정
   */
  @UseGuards(JwtAuthGuard)
  @Patch('/me')
  async updateMyInfo(
    @UserInfo() user: PartialUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    await this.usersService.updateMyInfo(user, updateUserDto);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.SUCCESS.USER_UPDATE,
    };
  }

  /**
   * 비밀번호 변경
   */
  @UseGuards(JwtAuthGuard)
  @Patch('/me/password')
  async updateMyPassword(
    @UserInfo() user: PartialUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.updateMyPassword(user, changePasswordDto);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.SUCCESS.PASSWORD_CHANGE,
    };
  }

  /**
   * 비승인 유저 목록 조회
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/pending')
  async getNonApprovedUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const data = await this.usersService.getNonApprovedUsers({
      page: _page,
      limit: _limit,
    });
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.ACCOUNT.SUCCESS.LIST_NON_APPROVED,
      data: data,
    };
  }
  /**
   * 유저 계정 승인
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/:userId/approve')
  async approveUserAccount(
    @Param('userId', ParseIntPipe) userId: number,
    @UserInfo() admin: PartialUser,
  ) {
    const adminId = admin.userId;
    await this.usersService.approveUserAccount(userId, adminId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.ACCOUNT.SUCCESS.APPROVE,
    };
  }

  /**
   * 유저 계정 거절
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/:userId/reject')
  async rejectUserAccount(
    @Param('userId', ParseIntPipe) userId: number,
    @UserInfo() admin: PartialUser,
  ) {
    const adminId = admin.userId;
    await this.usersService.rejectUserAccount(userId, adminId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.ACCOUNT.SUCCESS.REJECT,
    };
  }

  /**
   * 블랙리스트 유저 목록
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/blacklist')
  async getBlacklistUsers(@Query('page') page = 1, @Query('limit') limit = 10) {
    const _page = Math.max(Number(page) || 1, 1);
    const _limit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const data = await this.usersService.getBlacklistUsers({
      page: _page,
      limit: _limit,
    });
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.ACCOUNT.SUCCESS.BLACKLIST,
      data: data,
    };
  }

  /**
   * 블랙리스트 유저 복구
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/:userId/unblacklist')
  async unBlacklistUser(
    @Param('userId', ParseIntPipe) userId: number,
    @UserInfo() admin: PartialUser,
  ) {
    const adminId = admin.userId;
    await this.usersService.unBlacklistUser(userId, adminId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.ACCOUNT.SUCCESS.UNBLACKLIST,
    };
  }

  /**
   * 유저 정보 수정
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/:userId/info')
  async updateUserInfo(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
    @UserInfo() admin: PartialUser,
  ) {
    await this.usersService.updateUserInfo(userId, updateUserDto, admin.userId);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.USER.SUCCESS.UPDATE,
    };
  }

  /**
   * 유저 비밀번호 초기화
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/:userId/reset-password')
  async resetUserPassword(
    @Param('userId', ParseIntPipe) userId: number,
    @UserInfo() admin: PartialUser,
    @Body() resetUserPassword: ResetUserPasswordDto,
  ) {
    await this.usersService.resetUserPassword(
      userId,
      admin.userId,
      resetUserPassword,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.USER.SUCCESS.RESET_PASSWORD,
    };
  }

  /**
   * 학생-부모 연동 등록
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('link-parent/students/:studentId/parents/:parentId')
  async linkStudentParent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('parentId', ParseIntPipe) parentId: number,
    @UserInfo() admin: PartialUser,
  ) {
    await this.usersService.linkStudentParent(
      studentId,
      parentId,
      admin.userId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.USER.SUCCESS.LINK_STUDENT_PARENT,
    };
  }

  /**
   * 학생-부모 연동 해제
   * @returns
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('unlink-parent/students/:studentId/parents/:parentId')
  async unlinkStudentParent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('parentId', ParseIntPipe) parentId: number,
    @UserInfo() admin: PartialUser,
  ) {
    await this.usersService.unlinkStudentParent(
      studentId,
      parentId,
      admin.userId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.ADMIN.USER.SUCCESS.UNLINK_STUDENT_PARENT,
    };
  }
}
