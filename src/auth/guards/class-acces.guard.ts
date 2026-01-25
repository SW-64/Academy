import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Parent } from '../../parents/entities/parent.entity';
import { StudentClass } from '../../student-class/entities/student-class.entity';
import { Role } from '../../users/entities/user.entity';
import { IsNull, In } from 'typeorm';

/**
 * 반 접근 권한 검증 Guard
 * - ADMIN: 모든 반 접근 가능
 * - STUDENT: 본인이 속한 반만
 * - PARENT: 자녀가 속한 반만
 *
 * 사용법:
 * @UseGuards(JwtAuthGuard, RolesGuard, ClassAccessGuard)
 * @Roles(Role.ADMIN, Role.STUDENT, Role.PARENT)
 * @Get('/classes/:classId/...')
 */
@Injectable()
export class ClassAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(StudentClass)
    private readonly studentClassRepository: Repository<StudentClass>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // JwtAuthGuard에서 주입된 사용자 정보

    if (!user) {
      throw new ForbiddenException('인증되지 않은 사용자입니다');
    }

    // URL에서 classId 추출
    const classId = parseInt(request.params.classId);
    if (!classId || isNaN(classId)) {
      throw new ForbiddenException('유효하지 않은 반 ID입니다');
    }

    // ADMIN은 모든 반 접근 가능
    if (user.role === Role.ADMIN) {
      return true;
    }

    // STUDENT 검증
    if (user.role === Role.STUDENT) {
      return await this.validateStudentAccess(classId, user.userId);
    }

    // PARENT 검증
    if (user.role === Role.PARENT) {
      return await this.validateParentAccess(classId, user.userId);
    }

    // 그 외 역할은 차단
    throw new ForbiddenException('해당 반에 접근 권한이 없습니다');
  }

  /**
   * STUDENT 권한 검증
   */
  private async validateStudentAccess(
    classId: number,
    userId: number,
  ): Promise<boolean> {
    const student = await this.studentRepository.findOne({
      where: { userId },
      select: { studentId: true },
    });

    if (!student) {
      throw new NotFoundException('학생 정보를 찾을 수 없습니다');
    }

    const link = await this.studentClassRepository.findOne({
      where: {
        classId,
        studentId: student.studentId,
        deletedAt: IsNull(),
      },
      select: { studentClassId: true },
    });

    if (!link) {
      throw new ForbiddenException('해당 반에 접근 권한이 없습니다');
    }

    return true;
  }

  /**
   * PARENT 권한 검증
   */
  private async validateParentAccess(
    classId: number,
    userId: number,
  ): Promise<boolean> {
    const parent = await this.parentRepository.findOne({
      where: { userId },
      select: { parentId: true },
    });

    if (!parent) {
      throw new NotFoundException('학부모 정보를 찾을 수 없습니다');
    }

    const children = await this.studentRepository.find({
      where: { parentId: parent.parentId },
      select: { studentId: true },
    });

    const childIds = children.map((c) => c.studentId);

    if (childIds.length === 0) {
      throw new ForbiddenException('자녀 정보가 없습니다');
    }

    const link = await this.studentClassRepository
      .createQueryBuilder('sc')
      .where('sc.class_id = :classId', { classId })
      .andWhere('sc.student_id IN (:...childIds)', { childIds })
      .andWhere('sc.deleted_at IS NULL')
      .select(['sc.studentClassId'])
      .getOne();

    if (!link) {
      throw new ForbiddenException('해당 반에 접근 권한이 없습니다');
    }

    return true;
  }
}
