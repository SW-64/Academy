import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthService } from './../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      // 1. 리프레시 토큰을 "쿠키"에서 읽도록 설정
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.Refresh,
      ]),

      // 2. 리프레시 토큰 서명 검증에 사용할 secret
      secretOrKey: configService.get<string>('REFRESH_TOKEN_SECRET'),

      // 3. validate 함수에서 req를 함께 받고 싶으면 true
      passReqToCallback: true,
    });
  }

  async validate(req, jwtPayload: JwtPayload) {
    // 1. 쿠키에서 리프레시 토큰 원문 꺼내기
    const refreshToken = req.cookies?.Refresh;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // 2. DB에 저장된 해시와 비교 + 만료 여부 검증
    const user = await this.authService.getUserIfRefreshTokenMatches(
      refreshToken,
      jwtPayload.userId,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const payload = {
      userId: user.userId,
      role: user.user.role,
    };
    // 3. 여기서 리턴하는 값이 req.user 에 들어간다.
    return payload;
  }
}
