import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { MESSAGES } from './../constants/message.constant';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}
  // 내 정보 조회
  async getMyInfo(userId: number) {
    const user = await this.userRepository.findOneBy({ userId });
    return user;
  }

  // 내 정보 수정
  async updateMyInfo(userId: number, updateUserDto: UpdateUserDto) {
    await this.userRepository.update({ userId }, updateUserDto);
    return this.userRepository.findOneBy({ userId });
  }

  // 비밀번호 변경
  async updateMyPassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword, newPasswordConfirm } =
      changePasswordDto;

    if (newPassword !== newPasswordConfirm) {
      MESSAGES.AUTH.COMMON.PASSWORD_CONFIRM.NOT_MATCHED_WITH_PASSWORD;
    }

    const user = await this.userRepository.findOne({
      where: { userId },
      select: {
        password: true,
      },
    });
    if (!user) return null; // 아이디 없음 → null → Guard가 401

    const comparePassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!comparePassword) return null; // 비번 틀림 → null → Guard가 401

    // 비밀번호 암호화
    const hashRounds = this.configService.get<number>('PASSWORD_HASH');
    const hashedPassword = await bcrypt.hash(newPassword, hashRounds);

    await this.userRepository.update(
      { userId },
      {
        password: hashedPassword,
      },
    );

    return;
  }
}
