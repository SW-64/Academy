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

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
