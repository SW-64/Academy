import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { Role, User } from '../../users/entities/user.entity';
import { ActionLog } from '../../action-logs/entities/action-logs.entity';
import { SignUpDto } from '../dto/sign-up.dto';
import { MESSAGES } from '../../constants/message.constant';

@Injectable()
export class Argon2AuthService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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
    const existedLoginId = await this.userRepository.findOneBy({ loginId });
    if (existedLoginId)
      throw new BadRequestException(MESSAGES.AUTH.ERROR.DUPLICATED_LOGIN_ID);

    const existedPhone = await this.userRepository.findOneBy({ phone });
    if (existedPhone)
      throw new BadRequestException(MESSAGES.AUTH.ERROR.DUPLICATED_PHONE);

    if (password !== passwordConfirm) {
      throw new BadRequestException(
        MESSAGES.AUTH.VALIDATION.PASSWORD_CONFIRM.NOT_MATCHED,
      );
    }

    if (role === Role.STUDENT) {
      if (!signupGrade || !signupSchool) {
        throw new BadRequestException(
          MESSAGES.AUTH.VALIDATION.SIGN_UP.STUDENT_SCHOOL_GRADE_REQUIRED,
        );
      }
    } else {
      if (signupGrade || signupSchool) {
        throw new BadRequestException(
          MESSAGES.AUTH.VALIDATION.SIGN_UP.PARENT_SCHOOL_GRADE_FORBIDDEN,
        );
      }
    }

    // argon2id로 해싱 (기본값: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4)
    const hashedPassword = await argon2.hash(password);

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
        description: 'User signed up (argon2)',
        createdAt: new Date(),
      });

      return savedUser;
    });

    delete user.password;
    return user;
  }
}
