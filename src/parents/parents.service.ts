import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';

import { Role, Status, User } from '../users/entities/user.entity';
import { Parent } from './entities/parent.entity';

import { MESSAGES } from '../constants/message.constant';
import { Student } from '../students/entities/student.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(StudentClass)
    private readonly studentClassRepository: Repository<StudentClass>,
  ) {}

  // 자녀조회
  async getMyStudents(userId: number) {
    const parent = await this.parentRepository.findOne({
      where: { userId },
      select: { parentId: true },
    });
    if (!parent) throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);

    const rows = await this.studentRepository
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .select([
        's.studentId AS studentId',
        's.school AS school',
        's.grade AS grade',
        'u.userId AS userId',
        'u.name AS name',
      ])
      .where('s.parentId = :parentId', { parentId: parent.parentId })
      .orderBy('u.name', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      studentId: Number(r.studentId),
      school: r.school,
      grade: r.grade,
      user: { userId: Number(r.userId), name: r.name },
    }));
  }

  // 학부모 목록 조회
  async findAllParents(options?: IPaginationOptions) {
    const where: FindOptionsWhere<User> = {
      role: Role.PARENT,
      status: Status.approved,
    };

    // paginate 사용
    return paginate(this.userRepository, options, {
      order: { name: 'ASC' },
      relations: ['parent', 'parent.student', 'parent.student.user'],
      where,
      select: {
        userId: true,
        email: true,
        name: true,
        status: true,
        role: true,
        phone: true,
        createdAt: true,
        parent: {
          parentId: true,
          student: {
            studentId: true,
            user: {
              userId: true,
              name: true,
            },
          },
        },
      },
    });
  }

  // 학부모 상세 조회
  async findOneParent(parentId: number) {
    const parent = await this.parentRepository.findOne({
      where: { parentId },
      relations: {
        user: true,
        student: {
          user: true,
        },
      },
      select: {
        parentId: true,
        user: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          status: true,
        },
        student: {
          studentId: true,
          userId: true,
          grade: true,
          school: true,
          createdAt: true,
          user: {
            name: true,
            phone: true,
          },
        },
      },
    });
    if (!parent) {
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }
    return parent;
  }

  // 자녀가 속한 클래스 조회 (부모)
  async getMyChildClasses(userId: number, studentId: number) {
    const parent = await this.parentRepository.findOne({
      where: { userId },
      select: { parentId: true },
    });
    if (!parent) {
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }

    const student = await this.studentRepository.findOne({
      where: { parentId: parent.parentId, studentId },
      select: { studentId: true },
    });
    if (!student) {
      throw new NotFoundException(MESSAGES.PARENTS.STUDENT.ERROR.NOT_FOUND);
    }

    const rows = await this.studentClassRepository
      .createQueryBuilder('sc')
      .innerJoin('sc.clazz', 'c')
      .select(['c.classId AS classId', 'c.className AS className'])
      .where('sc.studentId = :studentId', { studentId: student.studentId })
      .getRawMany();

    return rows.map((r) => ({
      classId: Number(r.classId),
      className: r.className,
    }));
  }
}
