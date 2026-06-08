import { BadRequestException, Injectable, Res } from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';

import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Role, User } from '../users/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { MESSAGES } from './../constants/message.constant';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './entities/refreshtoken.entity';
import { Response } from 'express';
import { BcryptService } from '../utils/bcrypt.service';
import { ActionLog } from './../action-logs/entities/action-logs.entity';
@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource, // 추가
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly bcryptService: BcryptService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
  ) {}
  // 회원가입
  async signUp({
    name,
    loginId,
    role,
    phone,
    password,
    passwordConfirm,
    signupSchool,
    signupGrade,
  }: SignUpDto) {
    // 유효성 검증
    // 1. loginId
    // 기존 이메일로 가입된 이력이 있을 경우 False
    const existedLoginId = await this.userRepository.findOneBy({ loginId });
    if (existedLoginId)
      throw new BadRequestException(MESSAGES.AUTH.ERROR.DUPLICATED_LOGIN_ID);

    // 2. phone
    // 기존 연락처로 가입된 이력이 있을 경우 False
    const existedPhone = await this.userRepository.findOneBy({ phone });
    if (existedPhone)
      throw new BadRequestException(MESSAGES.AUTH.ERROR.DUPLICATED_PHONE);

    // 3. password confirm
    if (password !== passwordConfirm) {
      throw new BadRequestException(
        MESSAGES.AUTH.VALIDATION.PASSWORD_CONFIRM.NOT_MATCHED,
      );
    }

    // 4. signupGrade, signupSchool
    // Role이 STUDENT일 경우에만 값이 있어야 함
    if (role === Role.STUDENT) {
      if (!signupGrade || !signupSchool) {
        throw new BadRequestException(
          MESSAGES.AUTH.VALIDATION.SIGN_UP.STUDENT_SCHOOL_GRADE_REQUIRED,
        );
      }
    }
    // Role이 STUDENT가 아닐 경우에는 값이 없어야 함
    else {
      if (signupGrade || signupSchool) {
        throw new BadRequestException(
          MESSAGES.AUTH.VALIDATION.SIGN_UP.PARENT_SCHOOL_GRADE_FORBIDDEN,
        );
      }
    }

    // 유효성검증 끝

    // 비밀번호 암호화
    const hashRounds = this.configService.get<number>('PASSWORD_HASH');
    const hashedPassword = await this.bcryptService.hash(password, hashRounds);

    // 트랜잭션으로 묶기
    const user = await this.dataSource.transaction(async (manager) => {
      const savedUser = await manager.save(User, {
        loginId,
        password: hashedPassword,
        name,
        role,
        phone,
        signupSchool,
        signupGrade,
      });

      await manager.save(ActionLog, {
        actorId: savedUser.userId,
        actorType: role === Role.ADMIN ? 'admin' : 'user',
        action: 'SIGN_UP',
        description: 'User signed up',
        createdAt: new Date(),
      });

      return savedUser;
    });

    delete user.password;
    return user;
  }

  // 로그인
  async signIn(userId: number, role: Role, res: Response) {
    const { accessToken, ...accessOption } = this.createAccessToken(
      userId,
      role,
    );
    const { refreshToken, ...refreshOption } = this.createRefreshToken(userId);
    await this.setCurrentRefreshToken(refreshToken, userId);
    res.cookie('Authentication', accessToken, accessOption);
    res.cookie('Refresh', refreshToken, refreshOption);

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: userId,
      actorType: role === Role.ADMIN ? 'admin' : 'user',
      action: 'SIGN_IN',
      description: 'User signed in',
      createdAt: new Date(),
    });
    return { accessToken };
  }

  // 로그아웃
  async signOut(userId: number, res: Response) {
    const base = this.getCookieBaseOption();
    const accessOption = { ...base, maxAge: 0 };
    const refreshOption = { ...base, maxAge: 0 };

    res.clearCookie('Authentication', accessOption);
    res.clearCookie('Refresh', refreshOption);

    await this.removeRefreshToken(userId);
    return;
  }

  // accesstoken 생성
  createAccessToken(userId: number, role: Role) {
    const payload = { userId: userId, role: role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<number>('JWT_EXPIRES_IN'),
    });
    const base = this.getCookieBaseOption();

    // accesstoken을 쿠키에 담아 클라이언트에 전달하기 위함
    return {
      ...base,
      maxAge: this.configService.get('JWT_EXPIRES_IN') * 1000,
      accessToken: accessToken,
    };
  }
  // refreshtoken 생성
  createRefreshToken(userId: number) {
    const payload = { userId: userId };
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<number>('REFRESH_TOKEN_EXPIRES_IN'),
    });
    const base = this.getCookieBaseOption();
    return {
      ...base,
      maxAge: this.configService.get('REFRESH_TOKEN_EXPIRES_IN') * 1000,
      refreshToken: refreshToken,
    };
  }
  // refreshtoken 삭제
  async removeRefreshToken(userId: number) {
    await this.refreshTokenRepository.delete({ userId });
    return;
  }

  // refreshtoken 데이터베이스에 저장
  async setCurrentRefreshToken(refreshToken: string, userId: number) {
    // const saltRounds = this.configService.get<number>('REFRESH_TOKEN_HASH');
    const expiresSec = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRES_IN',
    );

    // 1. refreshToken 암호화
    // const currentHashedRefreshToken = await bcrypt.hash(
    //   refreshToken,
    //   saltRounds,
    // );
    // 2. refreshToken 만료시간 계산
    const expiresAt = new Date(Date.now() + expiresSec * 1000);

    // 3. Upsert 패턴으로 원자적 처리
    await this.refreshTokenRepository
      .createQueryBuilder()
      .insert()
      .into(RefreshToken)
      .values({
        userId: userId,
        refreshtoken: refreshToken,
        createdAt: new Date(),
        expiresAt: expiresAt,
      })
      .orUpdate(['refreshtoken', 'expires_at'], ['userId'])
      .updateEntity(false)
      .execute();
  }

  // refreshtoken 유효성 검사
  async getUserIfRefreshTokenMatches(refreshToken: string, userId: number) {
    // 1. userId로 DB에서 refreshToken 조회
    const saved = await this.refreshTokenRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!saved || !saved.refreshtoken) {
      return null;
    }
    // 2. 토큰 일치 여부 검사 (argon2 교체 전 임시)
    if (refreshToken !== saved.refreshtoken) return null;
    // 3. 만료 여부 검사
    if (!saved.expiresAt || Date.now() > saved.expiresAt.getTime()) {
      return null;
    }

    return saved;
  }

  // 토큰 재발급
  async reissueAccessToken(userId: number, role: Role, res: Response) {
    const { accessToken, ...accessOption } = this.createAccessToken(
      userId,
      role,
    );
    const { refreshToken, ...refreshOption } = this.createRefreshToken(userId);
    await this.setCurrentRefreshToken(refreshToken, userId); // 리프레시 토큰 교체
    res.cookie('Authentication', accessToken, accessOption);
    res.cookie('Refresh', refreshToken, refreshOption); // 새 리프레시 쿠키 발급

    return { accessToken };
  }

  // 쿠키 기본 옵션
  private getCookieBaseOption() {
    return {
      path: '/',
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: this.configService.get('COOKIE_SAMESITE') ?? 'lax',
    } as const;
  }

  // 토큰 점검
  async checkToken(userId: number, role: Role) {
    return { userId, role };
  }
}
