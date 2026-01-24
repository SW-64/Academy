import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Role } from '../../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Class } from './../../class/entities/class.entity';
import { Student } from './../../students/entities/student.entity';
import { StudentClass } from '../../student-class/entities/student-class.entity';
import { IsNull, Repository } from 'typeorm';
import { MESSAGES } from './../../constants/message.constant';
/**
 * STUDENT: Class에 해당되는 학생인지 검증
 * PARENT : 거부
 * ADMIN  : 그냥 통과
 *
 * 전제: Class가 존재하는지 여부 검증
 */
@Injectable()
export class ClassAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Class)
    private readonly classRepo: Repository<Class>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(StudentClass)
    private readonly studentClassRepo: Repository<StudentClass>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const user = req.user as { userId?: number; role?: Role } | undefined;
    if (!user?.userId)
      throw new UnauthorizedException(MESSAGES.AUTH.ERROR.UNAUTHORIZED);

    const classId = Number(req.params?.classId);
    if (!Number.isInteger(classId) || classId <= 0) {
      throw new ForbiddenException(MESSAGES.AUTH.ERROR.INVALID_PARAM);
    }

    // 1) class 존재 확인
    const existedClass = await this.classRepo.existsBy({
      classId,
    });
    if (!existedClass) {
      throw new ForbiddenException(MESSAGES.AUTH.ERROR.FORBIDDEN_CLASS_ACCESS);
    }

    // 2) role별 접근 정책
    switch (user.role) {
      case Role.ADMIN:
        return true;

      case Role.STUDENT:
        return this.checkStudentInClass(user.userId, classId);

      default:
        throw new ForbiddenException(MESSAGES.AUTH.ERROR.FORBIDDEN_ROLE);
    }
  }

  private async checkStudentInClass(
    userId: number,
    classId: number,
  ): Promise<boolean> {
    // userId -> studentId
    const student = await this.studentRepo.findOne({
      where: { userId },
      select: { studentId: true },
    });
    if (!student)
      throw new ForbiddenException(MESSAGES.AUTH.ERROR.FORBIDDEN_ROLE);

    // 소속 확인
    const isInClass = await this.studentClassRepo.existsBy({
      classId,
      studentId: student.studentId,
      deletedAt: IsNull(),
    });

    if (!isInClass)
      throw new ForbiddenException(MESSAGES.AUTH.ERROR.FORBIDDEN_ROLE);
    return true;
  }
}
