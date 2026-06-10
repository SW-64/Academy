import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import { BcryptService } from '../utils/bcrypt.service';
import { ConfigService } from '@nestjs/config';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';

import { Parent } from './../parents/entities/parent.entity';
import { Role, Status, User } from './entities/user.entity';

import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { MESSAGES } from './../constants/message.constant';
import { RefreshToken } from '../auth/entities/refreshtoken.entity';
import { ActionLog } from './../action-logs/entities/action-logs.entity';
import { PartialUser } from './interfaces/partial-user.entity';
import { Student } from './../students/entities/student.entity';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, cacheKey } from '../constants/cache-keys.constant';

@Injectable()
export class UsersService {
  constructor(
    private readonly cache: CacheService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly bcryptService: BcryptService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}
  // 내 정보 조회
  async getMyInfo(userId: number) {
    const user = await this.userRepository.findOne({
      where: { userId },
      select: {
        userId: true,
        loginId: true,
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
  async updateMyInfo(user: PartialUser, updateUserDto: UpdateUserDto) {
    const { name, phone, school, grade } = updateUserDto;
    const userId = user.userId;
    const updatedUser = await this.userRepository.update(
      { userId },
      { name, phone },
    );
    if (updatedUser.affected === 0) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    if (user.role == Role.STUDENT) {
      const updatedStudent = await this.studentRepository.update(
        { userId },
        { school, grade },
      );
      if (updatedStudent.affected === 0) {
        throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
      }
    }

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: userId,
      actorType: user.role === Role.STUDENT ? 'user' : 'admin',
      action: 'UPDATE_INFO',
      description: 'User updated their information',
      changes: { updateUserDto },
      createdAt: new Date(),
    });
    return;
  }

  // 비밀번호 변경
  async updateMyPassword(
    user: PartialUser,
    changePasswordDto: ChangePasswordDto,
  ) {
    const userId = user.userId;
    const { currentPassword, newPassword, newPasswordConfirm } =
      changePasswordDto;

    // 1) 비밀번호 일치 검증
    if (newPassword !== newPasswordConfirm) {
      throw new BadRequestException(
        MESSAGES.AUTH.VALIDATION.PASSWORD_CONFIRM.NOT_MATCHED,
      );
    }

    // 2) 트랜잭션 내에서 락 + 재검증
    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const rtRepo = manager.getRepository(RefreshToken);

      // 2-1) FOR UPDATE 락으로 동시 변경 직렬화
      const lockedUser = await userRepo
        .createQueryBuilder('u')
        .where('u.userId = :userId', { userId })
        .setLock('pessimistic_write') // ← 행 잠금
        .select(['u.userId', 'u.password'])
        .getOne();

      if (!lockedUser) {
        throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
      }

      // 2-2) 락을 잡은 상태에서 현재 비밀번호 재검증
      const isValid = await this.bcryptService.compare(
        currentPassword,
        lockedUser.password,
      );
      if (!isValid) {
        throw new BadRequestException(
          MESSAGES.AUTH.VALIDATION.PASSWORD.CURRENT_INCORRECT,
        );
      }

      // 2-3) 비밀번호 암호화
      const hashRounds = Number(
        this.configService.get<number>('PASSWORD_HASH') ?? 10,
      );
      const hashedPassword = await this.bcryptService.hash(newPassword, hashRounds);

      // 2-4) 업데이트 + RefreshToken 삭제
      await userRepo.update({ userId }, { password: hashedPassword });
      await rtRepo.delete({ userId });

      // 2-5) 로그 저장
      await manager.getRepository(ActionLog).save({
        actorId: userId,
        actorType: user.role === Role.STUDENT ? 'user' : 'admin',
        action: 'PASSWORD_CHANGE',
        description: 'User changed their password',
        createdAt: new Date(),
      });
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
  async approveUserAccount(userId: number, adminId: number) {
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
        const student = await studentRepo.findOne({
          where: { userId: user.userId },
        });
        if (!student) {
          await studentRepo
            .createQueryBuilder()
            .insert()
            .into(Student)
            .values({
              userId: user.userId,
              grade: user.signupGrade,
              school: user.signupSchool,
            })
            .orIgnore() // ← 중복 시 무시
            .execute();
        }
      }

      if (user.role === Role.PARENT) {
        const parent = await parentRepo.findOne({
          where: { userId: user.userId },
        });
        if (!parent) {
          await parentRepo
            .createQueryBuilder()
            .insert()
            .into(Parent)
            .values({ userId: user.userId })
            .orIgnore() // ← 중복 시 무시
            .execute();
        }
      }

      // 로그 저장
      await manager.getRepository(ActionLog).save({
        actorId: adminId,
        actorType: 'admin',
        action: 'APPROVE_ACCOUNT',
        targetId: userId,
        targetType: 'user',
        description: 'Admin approved user account',
        createdAt: new Date(),
      });
    });

    await this.invalidateUserCache(); // 캐시 무효화
  }

  // 유저 계정 거부
  async rejectUserAccount(userId: number, adminId: number) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    user.status = Status.rejected;
    await this.userRepository.save(user);

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'REJECT_ACCOUNT',
      targetId: userId,
      targetType: 'user',
      description: 'Admin rejected user account',
      createdAt: new Date(),
    });
    await this.invalidateUserCache(); // 캐시 무효화
    return;
  }

  // 블랙리스트 유저 목록 조회
  async getBlacklistUsers(options?: IPaginationOptions) {
    const where: FindOptionsWhere<User> = {
      status: Status.rejected,
    };
    // paginate 사용
    return paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      where,
    });
  }

  // 블랙리스트 유저 복구
  async unBlacklistUser(userId: number, adminId: number) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    user.status = Status.pending;
    await this.userRepository.save(user);

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'UNBLACKLIST_USER',
      targetId: userId,
      targetType: 'user',
      description: 'Admin unblacklisted user account',
      createdAt: new Date(),
    });
    return;
  }
  // 유저 정보 수정
  async updateUserInfo(
    userId: number,
    { name, phone, grade, school }: UpdateUserDto,
    adminId: number,
  ) {
    // 1) user patch (loginId/name/phone)
    const userPatch: Record<string, any> = {};
    if (name !== undefined) userPatch.name = name;
    if (phone !== undefined) userPatch.phone = phone;

    // 2) student patch (grade/school)
    const studentPatch: Record<string, any> = {};
    if (grade !== undefined) studentPatch.grade = grade;
    if (school !== undefined) studentPatch.school = school;

    const hasUserPatch = Object.keys(userPatch).length > 0;
    const hasStudentPatch = Object.keys(studentPatch).length > 0;

    // 3) 둘 다 없으면 변경 없음
    if (!hasUserPatch && !hasStudentPatch) {
      throw new BadRequestException(MESSAGES.ADMIN.USER.ERROR.NO_CHANGE);
    }

    // 4) user 존재 확인 + role 파악 (캐시 무효화에 사용)
    const user = await this.userRepository.findOne({
      where: { userId },
      select: ['userId', 'role'],
    });
    if (!user) {
      throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
    }

    // 5) user update (값이 있을 때만)
    if (hasUserPatch) {
      await this.userRepository.update({ userId }, userPatch);
    }

    // 6) student update (값이 있을 때만)
    if (hasStudentPatch) {
      // 운영 규칙: 학생만 grade/school이 의미 있다면 role 체크 또는 student row 존재 확인 필요
      const updatedStudent = await this.studentRepository.update(
        { userId }, // Student가 userId FK를 갖는다는 가정
        studentPatch,
      );

      if (updatedStudent.affected === 0) {
        // 정책 선택:
        // - 학생이 아닌데 grade/school을 보냈으면 BadRequest
        // - 학생인데 student row가 없으면 NotFound(데이터 불일치)
        throw new BadRequestException(MESSAGES.ADMIN.STUDENT.ERROR.NOT_FOUND);
      }
    }

    // 로그 저장
    // await this.actionLogRepository.save({
    //   actorId: adminId,
    //   actorType: 'admin',
    //   action: 'UPDATE_USER_INFO',
    //   targetId: userId,
    //   targetType: 'user',
    //   description: 'Admin updated user information',
    //   createdAt: new Date(),
    // });
    await this.invalidateUserCache(user.role); // 캐시 무효화

    return;
  }

  // 유저 비밀번호 초기화
  async resetUserPassword(
    userId: number,
    adminId: number,
    resetUserPassword: ResetUserPasswordDto,
  ) {
    const { newPassword, newPasswordConfirm } = resetUserPassword;
    // 1) 비밀번호 일치 검증
    if (newPassword !== newPasswordConfirm) {
      throw new BadRequestException(
        MESSAGES.AUTH.VALIDATION.PASSWORD_CONFIRM.NOT_MATCHED,
      );
    }

    // 2) 유저 검증
    const existedUser = await this.userRepository.findOne({
      where: { userId },
      select: {
        userId: true,
        loginId: true,
      },
    });
    if (!existedUser) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    // 3) 트랜잭션 내에서 락 + 재검증
    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const rtRepo = manager.getRepository(RefreshToken);

      // 2-1) FOR UPDATE 락으로 동시 변경 직렬화
      const lockedUser = await userRepo
        .createQueryBuilder('u')
        .where('u.userId = :userId', { userId })
        .setLock('pessimistic_write') // ← 행 잠금
        .select(['u.userId', 'u.password'])
        .getOne();

      if (!lockedUser) {
        throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
      }

      // 2-2) 비밀번호 암호화
      const hashRounds = Number(
        this.configService.get<number>('PASSWORD_HASH') ?? 10,
      );
      const hashedPassword = await this.bcryptService.hash(newPassword, hashRounds);

      // 2-3) 업데이트 + RefreshToken 삭제
      await userRepo.update({ userId }, { password: hashedPassword });
      await rtRepo.delete({ userId });

      // 2-4) 로그 저장
      await manager.getRepository(ActionLog).save({
        actorId: adminId,
        actorType: 'admin',
        action: 'RESET_USER_PASSWORD',
        targetId: userId,
        targetType: 'user',
        description: 'Admin reset user password',
        createdAt: new Date(),
      });
    });

    return;
  }

  // 학생-부모 연동
  async linkStudentParent(
    studentId: number,
    parentId: number,
    adminId: number,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const studentRepo = manager.getRepository(Student);
      const parentRepo = manager.getRepository(Parent);
      const actionLogRepo = manager.getRepository(ActionLog);

      // 1) Parent 존재 확인
      const parent = await parentRepo.findOne({ where: { parentId } });
      if (!parent) {
        throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
      }

      // 2) 조건부 UPDATE로 동시성 방어
      // parentId가 NULL일 때만 업데이트 (레이스 컨디션 방지)
      const result = await studentRepo.update(
        { studentId, parentId: IsNull() }, // ← 조건: parentId가 NULL
        { parentId },
      );

      // 3) 업데이트 실패 처리
      if (!result.affected || result.affected === 0) {
        // affected=0 → studentId가 없거나 이미 연결됨
        const exists = await studentRepo.exist({ where: { studentId } });
        if (!exists) {
          throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
        }
        throw new BadRequestException(MESSAGES.ADMIN.USER.ERROR.ALREADY_LINKED);
      }

      // 4) 로그 저장
      await actionLogRepo.save({
        actorId: adminId,
        actorType: 'admin',
        action: 'LINK_STUDENT_PARENT',
        targetType: 'student-parent',
        targetId: studentId,
        description: `Admin linked student (studentId: ${studentId}) with parent (parentId: ${parentId})`,
        createdAt: new Date(),
      });
    });
  }

  // 학생-부모 연동 해제
  async unlinkStudentParent(
    studentId: number,
    parentId: number,
    adminId: number,
  ) {
    const student = await this.dataSource
      .getRepository(Student)
      .findOne({ where: { studentId, parentId } });
    if (!student) {
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }
    student.parentId = null;
    await this.dataSource.getRepository(Student).save(student);
    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'UNLINK_STUDENT_PARENT',
      targetType: 'student-parent',
      targetId: studentId,
      description: `Admin unlinked student (studentId: ${studentId}) from parent (parentId: ${parentId})`,
      createdAt: new Date(),
    });
    return;
  }

  /**
   * 유저 캐시 무효화 (캐시 삭제)
   * role 지정 시 해당 역할 캐시만 삭제, 미지정 시 전체 삭제
   */
  private async invalidateUserCache(role?: Role): Promise<void> {
    const logger = new Logger('UsersService:invalidateUserCache');

    try {
      if (role === Role.STUDENT || role === undefined) {
        await this.cache.del(CACHE_KEYS.ADMIN_STUDENTS_LIST_PAGE_1);
      }
      if (role === Role.PARENT || role === undefined) {
        await this.cache.del(CACHE_KEYS.ADMIN_PARENTS_LIST_PAGE_1);
      }
    } catch (error: any) {
      logger.warn(
        `Failed to invalidate user cache: ${error?.message}`,
        error?.stack,
      );
    }
  }
}
