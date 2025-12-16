import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';

import { Student } from '../students/entities/student.entity';
import { Parent } from './../parents/entities/parent.entity';
import { Role, User } from './entities/user.entity';

import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { MESSAGES } from './../constants/message.constant';

@Injectable()
export class UsersService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
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
      throw new Error(
        MESSAGES.AUTH.VALIDATION.PASSWORD_CONFIRM.NEW_NOT_MATCHED,
      );
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

  // 비승인 유저 목록 조회
  async getNonApprovedUsers(options?: IPaginationOptions) {
    const where: FindOptionsWhere<User> = {
      role: In([Role.STUDENT, Role.PARENT]),
    };
    where.isApproved = false;

    // paginate 사용
    return paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      where,
    });
  }

  // 유저 계정 승인
  async approveUserAccount(userId: number) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    user.isApproved = true;
    await this.userRepository.save(user);

    const student = await this.studentRepository.findOneBy({ userId });
    const parent = await this.parentRepository.findOneBy({ userId });

    if (!student && user.role === Role.STUDENT) {
      await this.studentRepository.save({
        userId: user.userId,
        grade: user.signupGrade,
        school: user.signupSchool,
      });
    }

    if (!parent && user.role === Role.PARENT) {
      await this.parentRepository.save({
        userId: user.userId,
      });
    }

    return;
  }

  // 유저 계정 거부
  async rejectUserAccount(userId: number) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    user.isApproved = false;
    await this.userRepository.save(user);

    return;
  }
}
