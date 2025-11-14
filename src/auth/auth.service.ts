import { BadRequestException, Injectable, Res } from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { MESSAGES } from './../constants/message.constant';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './entities/refreshtoken.entity';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshtokenRepository: Repository<RefreshToken>,
  ) {}
  // 회원가입
  async signUp({ name, email, role, phone, password }: SignUpDto) {
    // 유효성 검증
    // 1. email
    // 기존 이메일로 가입된 이력이 있을 경우 False
    const existedEmail = await this.userRepository.findOneBy({ email });
    if (existedEmail)
      throw new BadRequestException(MESSAGES.AUTH.COMMON.DUPLICATED);

    // 2. phone
    // 기존 연락처로 가입된 이력이 있을 경우 False
    const existedPhone = await this.userRepository.findOneBy({ phone });
    if (existedPhone)
      throw new BadRequestException(MESSAGES.AUTH.COMMON.DUPLICATED);

    // 유효성검증 끝

    // 비밀번호 암호화
    const hashRounds = this.configService.get<number>('PASSWORD_HASH');
    const hashedPassword = await bcrypt.hash(password, hashRounds);

    const user = await this.userRepository.save({
      email,
      password: hashedPassword,
      name,
      role,
      phone,
    });
    delete user.password;

    return user;
  }

  // 로그인
  async signIn(userId: number, res: Response) {
    const { accessToken, ...accessOption } = this.createAccessToken(userId);
    const { refreshToken, ...refreshOption } = this.createRefreshToken(userId);
    await this.setCurrentRefreshToken(refreshToken, userId);
    res.cookie('Authentication', accessToken, accessOption);
    res.cookie('Refresh', refreshToken, refreshOption);

    return { accessToken, refreshToken };
  }

  // accesstoken 생성
  createAccessToken(userId: number) {
    const payload = { user_id: userId };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<number>('JWT_EXPIRES_IN'),
    });
    // accesstoken을 쿠키에 담아 클라이언트에 전달하기 위함
    return {
      accessToken: accessToken,
      path: '/',
      httpOnly: true, // 클라이언트 측 스크립트에서 쿠키에 접근할 수 없어 보안 강화
      maxAge: Number(this.configService.get('JWT_EXPIRES_IN')) * 1000,
      //secure: false, // 개발 환경에서는 false, 배포 환경에서는 true로 설정할 것
      //sameSite: 'none',
    };
  }
  // refreshtoken 생성
  createRefreshToken(userId: number) {
    const payload = { user_id: userId };
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_SECRET'),
      expiresIn: this.configService.get<number>('REFRESH_TOKEN_EXPIRES_IN'),
    });
    return {
      refreshToken: refreshToken,
      path: '/',
      httpOnly: true,
      maxAge: Number(this.configService.get('REFRESH_TOKEN_EXPIRES_IN')) * 1000,
      //secure: false, // 개발 환경에서는 false, 배포 환경에서는 true로 설정할 것
      //sameSite: 'none',
    };
  }

  // refreshtoken 데이터베이스에 저장
  async setCurrentRefreshToken(refreshToken: string, userId: number) {
    // 1. refreshToken 암호화
    const currentHashedRefreshToken = await bcrypt.hash(
      refreshToken,
      this.configService.get<number>('REFRESH_TOKEN_HASH'),
    );
    // 2. refreshToken 만료시간 계산
    const expiresSec = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRES_IN',
    ); // 1209600
    const expiresAt = new Date(Date.now() + expiresSec * 1000);

    // 3. 유저가 이미 RefreshToken row를 가지고 있는지 검사
    const existedRefreshToken = await this.refreshtokenRepository.findOneBy({
      user_id: userId,
    });
    // 4-1. 이미 있다 → refreshtoken, expiresAt update
    const updateContent = {
      refreshtoken: currentHashedRefreshToken,
      expiresAt: expiresAt,
    };
    if (existedRefreshToken) {
      await this.refreshtokenRepository.update(
        { user_id: userId },
        updateContent,
      );
    } else {
      // 4-2. 없다 → 새 row 생성
      await this.refreshtokenRepository.save({
        user_id: userId,
        refreshtoken: currentHashedRefreshToken,
        createdAt: new Date(),
        expiresAt: expiresAt,
      });
    }
  }
}
