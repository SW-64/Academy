import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { PartialUser } from './interfaces/partial-user.entity';
import { MESSAGES } from './../constants/message.constant';
import { ChangePasswordDto } from './dto/change-password.dto';

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
      message: MESSAGES.AUTH.USER_INFO.SUCCEED,
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
      message: MESSAGES.AUTH.USER_UPDATE.SUCCEED,
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
      message: MESSAGES.AUTH.PASSWORD_CHANGE.SUCCEED,
    };
  }
}
