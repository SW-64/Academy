import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Student } from '../../students/entities/student.entity';
import { Parent } from '../../parents/entities/parent.entity';
import { Role } from '../../users/entities/user.entity';

/**
 * STUDENT: 본인 studentId만 접근 허용
 * PARENT : 본인 parentId에 연결된 학생(student.parentId)만 접근 허용
 * ADMIN  : 통과(옵션)
 *
 * 전제: JwtAuthGuard가 request.user에 { userId, role }을 넣어줌
 */
@Injectable()
export class StudentOrParentOwnsStudentGuard implements CanActivate {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { userId: number; role: Role } | undefined;

    const studentIdParam = req.params?.studentId;
    const studentId = Number(studentIdParam);

    if (!user || !user.userId || !user.role) {
      throw new ForbiddenException('인증 정보가 유효하지 않습니다.');
    }
    if (!Number.isInteger(studentId) || studentId <= 0) {
      throw new ForbiddenException('잘못된 학생 식별자입니다.');
    }

    // 관리자면 통과
    if (user.role === Role.ADMIN) return true;

    // STUDENT: 본인 studentId만
    if (user.role === Role.STUDENT) {
      const me = await this.studentRepository.findOne({
        where: { userId: user.userId },
        select: { studentId: true },
      });

      if (!me || me.studentId !== studentId) {
        throw new ForbiddenException('접근 권한이 없습니다.');
      }
      return true;
    }

    // PARENT: 내 parentId와 학생의 parentId가 일치해야 함
    if (user.role === Role.PARENT) {
      const parent = await this.parentRepository.findOne({
        where: { userId: user.userId },
        select: { parentId: true },
      });

      if (!parent) {
        throw new ForbiddenException('접근 권한이 없습니다.');
      }

      const targetStudent = await this.studentRepository.findOne({
        where: { studentId },
        select: { studentId: true, parentId: true },
      });

      if (!targetStudent || targetStudent.parentId !== parent.parentId) {
        throw new ForbiddenException('접근 권한이 없습니다.');
      }
      return true;
    }

    // 그 외 역할은 차단
    throw new ForbiddenException('접근 권한이 없습니다.');
  }
}
