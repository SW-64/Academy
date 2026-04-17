import {
  Controller,
  Post,
  Body,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Argon2AuthService } from './argon2-auth.service';
import { Argon2LocalAuthGuard } from './guards/argon2-local-auth.guard';
import { AuthService } from '../auth.service';
import { SignUpDto } from '../dto/sign-up.dto';
import { SignInDto } from '../dto/sign-in.dto';
import { UserInfo } from '../../util/decorators/user-info.decorator';
import { PartialUser } from '../../users/interfaces/partial-user.entity';
import { MESSAGES } from '../../constants/message.constant';

@ApiTags('인증 (argon2 실험용)')
@Controller('argon2-auth')
export class Argon2AuthController {
  constructor(
    private readonly argon2AuthService: Argon2AuthService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 회원가입 (argon2 해싱)
   */
  @Post('/sign-up')
  @Throttle({ default: { ttl: 60, limit: 10 } })
  async signUp(@Body() signUpDto: SignUpDto) {
    const data = await this.argon2AuthService.signUp(signUpDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: MESSAGES.AUTH.SUCCESS.SIGN_UP,
      data,
    };
  }

  /**
   * 로그인 (argon2 검증)
   */
  @UseGuards(Argon2LocalAuthGuard)
  @Throttle({ default: { ttl: 60, limit: 20 } })
  @Post('/sign-in')
  async signIn(
    @UserInfo() user: PartialUser,
    @Body() _signInDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.signIn(user.userId, user.role, res);

    return {
      statusCode: HttpStatus.OK,
      message: MESSAGES.AUTH.SUCCESS.SIGN_IN,
      data,
    };
  }
}
