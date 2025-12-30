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
    const userId = user.userId;
    await this.usersService.updateMyInfo(userId, updateUserDto);
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
    const userId = user.userId;
    await this.usersService.updateMyPassword(userId, changePasswordDto);
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
  async approveUserAccount(@Param('userId', ParseIntPipe) userId: number) {
    await this.usersService.approveUserAccount(userId);
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
  async rejectUserAccount(@Param('userId', ParseIntPipe) userId: number) {
    await this.usersService.rejectUserAccount(userId);
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
}
