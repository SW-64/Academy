import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
  Res,
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
  async signUp(@Body() signUpDto: SignUpDto) {
    const data = await this.authService.signUp(signUpDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.AUTH.SIGN_UP.SUCCEED,
      data: data,
    };
  }

  /**
   * 로그인
   * @param signInDto
   * @returns
   */
  @UseGuards(LocalAuthGuard)
  @Post('/sign-in')
  async signIn(
    @UserInfo() user: PartialUser,
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.signIn(user.userId, res);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.SIGN_IN.SUCCEED,
      data: data,
    };
  }
}
