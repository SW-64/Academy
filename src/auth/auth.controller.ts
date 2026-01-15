import {
  Controller,
  Post,
  Body,
  HttpStatus,
  UseGuards,
  Res,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { ApiTags } from '@nestjs/swagger';
import { MESSAGES } from './../constants/message.constant';
import { SignInDto } from './dto/sign-in.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UserInfo } from '../util/decorators/user-info.decorator';
import { PartialUser } from '../users/interfaces/partial-user.entity';
import { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { Throttle } from '@nestjs/throttler';
@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입
   * @param signUpDto
   * @returns
   */
  @Post('/sign-up')
  @Throttle({ default: { ttl: 60, limit: 10 } })
  async signUp(@Body() signUpDto: SignUpDto) {
    const data = await this.authService.signUp(signUpDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.AUTH.SUCCESS.SIGN_UP,
      data: data,
    };
  }

  /**
   * 로그인
   * @param signInDto
   * @returns
   */
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { ttl: 60, limit: 20 } })
  @Post('/sign-in')
  async signIn(
    @UserInfo() user: PartialUser,
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.signIn(user.userId, user.role, res);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.SUCCESS.SIGN_IN,
      data: data,
    };
  }

  /**
   * 로그아웃
   */
  @UseGuards(JwtAuthGuard)
  @Post('/sign-out')
  async signOut(
    @UserInfo() user: PartialUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = user.userId;
    await this.authService.signOut(userId, res);
    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.SUCCESS.SIGN_OUT,
    };
  }

  /**
   * 토큰 재발급
   */
  @UseGuards(JwtRefreshAuthGuard)
  @Throttle({ default: { ttl: 60, limit: 30 } })
  @Post('/token')
  async getAccessToken(
    @UserInfo() user: PartialUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.reissueAccessToken(
      user.userId,
      user.role,
      res,
    );

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.SUCCESS.REFRESH,
      data: data,
    };
  }

  /**
   * 세션/토큰 점검
   */
  @UseGuards(JwtAuthGuard)
  @Get('/token')
  async checkToken(@UserInfo() user: PartialUser) {
    const data = await this.authService.checkToken(user.userId, user.role);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.SUCCESS.TOKEN_VALID,
      data: data,
    };
  }
}
