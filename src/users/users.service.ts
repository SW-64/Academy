import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';

import { Student } from '../students/entities/student.entity';
import { Parent } from './../parents/entities/parent.entity';
import { Role, Status, User } from './entities/user.entity';

import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { MESSAGES } from './../constants/message.constant';
import { RefreshToken } from 'src/auth/entities/refreshtoken.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}
  // 내 정보 조회
  async getMyInfo(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId },
      select: {
        userId: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        status: true,
        signupGrade: true,
        signupSchool: true,
      },
    });
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    return user;
  }

  // 내 정보 수정
  async updateMyInfo(userId: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.update({ userId }, updateUserDto);
    if (user.affected === 0) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    return;
  }

  // 비밀번호 변경
  async updateMyPassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword, newPasswordConfirm } =
      changePasswordDto;

    if (newPassword !== newPasswordConfirm) {
      throw new BadRequestException(
        MESSAGES.AUTH.VALIDATION.PASSWORD_CONFIRM.NOT_MATCHED,
      );
    }

    const user = await this.userRepository.findOne({
      where: { userId },
      select: {
        userId: true,
        password: true,
      },
    });
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }

    // 비밀번호 암호화
    const hashRounds = Number(
      this.configService.get<number>('PASSWORD_HASH') ?? 10,
    );
    const hashedPassword = await bcrypt.hash(newPassword, hashRounds);

    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(User)
        .update({ userId }, { password: hashedPassword });
      await manager.getRepository(RefreshToken).delete({ userId });
    });

    return;
  }

  // 비승인 유저 목록 조회
  async getNonApprovedUsers(options?: IPaginationOptions) {
    const where: FindOptionsWhere<User> = {
      role: In([Role.STUDENT, Role.PARENT]),
    };
    where.status = Status.pending;

    // paginate 사용
    return paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      where,
    });
  }

  // 유저 계정 승인
  async approveUserAccount(userId: number) {
    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const studentRepo = manager.getRepository(Student);
      const parentRepo = manager.getRepository(Parent);

      const user = await userRepo.findOne({ where: { userId } });
      if (!user) throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);

      // 이미 승인된 경우 return
      if (user.status === Status.approved) return;

      user.status = Status.approved;
      await userRepo.save(user);

      if (user.role === Role.STUDENT) {
        const student = await studentRepo.findOne({ where: { userId } });
        if (!student) {
          await studentRepo.save({
            userId: user.userId,
            grade: user.signupGrade,
            school: user.signupSchool,
          });
        }
      }

      if (user.role === Role.PARENT) {
        const parent = await parentRepo.findOne({ where: { userId } });
        if (!parent) {
          await parentRepo.save({ userId: user.userId });
        }
      }
    });
  }

  // 유저 계정 거부
  async rejectUserAccount(userId: number) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    user.status = Status.rejected;
    await this.userRepository.save(user);

    return;
  }
}
