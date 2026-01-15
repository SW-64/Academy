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

import { Parent } from './../parents/entities/parent.entity';
import { Role, Status, User } from './entities/user.entity';

import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { MESSAGES } from './../constants/message.constant';
import { RefreshToken } from 'src/auth/entities/refreshtoken.entity';
import { ActionLog } from './../action-logs/entities/action-logs.entity';
import { PartialUser } from './interfaces/partial-user.entity';
import { Student } from './../students/entities/student.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
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
  async updateMyInfo(user: PartialUser, updateUserDto: UpdateUserDto) {
    const userId = user.userId;
    const updatedUser = await this.userRepository.update(
      { userId },
      updateUserDto,
    );
    if (updatedUser.affected === 0) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
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

    const passwordOfUser = await this.userRepository.findOne({
      where: { userId },
      select: {
        userId: true,
        password: true,
      },
    });
    const comparePassword = await bcrypt.compare(
      currentPassword,
      passwordOfUser.password,
    );
    if (!comparePassword) {
      throw new BadRequestException(
        MESSAGES.AUTH.VALIDATION.PASSWORD.CURRENT_INCORRECT,
      );
    }

    if (newPassword !== newPasswordConfirm) {
      throw new BadRequestException(
        MESSAGES.AUTH.VALIDATION.PASSWORD_CONFIRM.NOT_MATCHED,
      );
    }

    const existedUser = await this.userRepository.findOne({
      where: { userId },
      select: {
        userId: true,
        password: true,
      },
    });
    if (!existedUser) {
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

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: userId,
      actorType: user.role === Role.STUDENT ? 'user' : 'admin',
      action: 'PASSWORD_CHANGE',
      description: 'User changed their password',
      createdAt: new Date(),
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
    { email, name, phone, grade, school }: UpdateUserDto,
    adminId: number,
  ) {
    // 1) user patch (email/name/phone)
    const userPatch: Record<string, any> = {};
    if (email !== undefined) userPatch.email = email;
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

    // 4) user update (값이 있을 때만)
    if (hasUserPatch) {
      const updatedUser = await this.userRepository.update(
        { userId },
        userPatch,
      );
      if (updatedUser.affected === 0) {
        throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
      }
    } else {
      // userPatch가 없더라도, studentPatch만 있을 때 user 존재는 확인하는 편이 안전
      const exists = await this.userRepository.exist({ where: { userId } });
      if (!exists) {
        throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
      }
    }

    // 5) student update (값이 있을 때만)
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
    return;
  }

  // 유저 비밀번호 초기화
  async resetUserPassword(userId: number, adminId: number) {
    const existedUser = await this.userRepository.findOne({
      where: { userId },
      select: {
        userId: true,
        email: true,
      },
    });
    if (!existedUser) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    // 비밀번호 암호화
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashRounds = Number(
      this.configService.get<number>('PASSWORD_HASH') ?? 10,
    );
    const hashedPassword = await bcrypt.hash(tempPassword, hashRounds);
    await this.userRepository.update({ userId }, { password: hashedPassword });

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'RESET_USER_PASSWORD',
      targetId: userId,
      targetType: 'user',
      description: 'Admin reset user password',
      createdAt: new Date(),
    });
    return;
  }

  // 학생-부모 연동
  async linkStudentParent(
    studentId: number,
    parentId: number,
    adminId: number,
  ) {
    const student = await this.dataSource
      .getRepository(Student)
      .findOne({ where: { studentId } });
    if (!student) {
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }
    const parent = await this.dataSource
      .getRepository(Parent)
      .findOne({ where: { parentId } });
    if (!parent) {
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }

    if (student.parentId) {
      throw new BadRequestException(MESSAGES.ADMIN.USER.ERROR.ALREADY_LINKED);
    }
    student.parentId = parentId;
    await this.dataSource.getRepository(Student).save(student);
    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'LINK_STUDENT_PARENT',
      targetType: 'student-parent',
      targetId: studentId,
      description: `Admin linked student (studentId: ${studentId}) with parent (parentId: ${parentId})`,
      createdAt: new Date(),
    });
    return;
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
}
