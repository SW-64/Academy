import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { FindOptionsWhere, Repository } from 'typeorm';

import { MESSAGES } from '../constants/message.constant';

import { startOfMonth, endOfMonth, format } from 'date-fns';

import { Role, User } from '../users/entities/user.entity';
import { Grade, Level } from '../grades/entities/grade.entity';
import { Student } from './entities/student.entity';
@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(Grade)
    private readonly gradesRepository: Repository<Grade>,
  ) {}

  async getAllGrades(studentId: number, year?: number, month?: number) {
    const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

    // 1. 성적 목록 조회
    const grades = await this.gradesRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.exam', 'exam')
      .where('grade.student_id = :studentId', { studentId })
      .andWhere('exam.exam_date BETWEEN :startDate AND :endDate', {
        startDate: start,
        endDate: end,
      })
      .orderBy('exam.exam_date', 'DESC')
      .select([
        'grade.gradeId',
        'grade.examId',
        'grade.studentId',
        'grade.score',
        'grade.level',
        'exam.year',
        'exam.exam_date',
        'exam.student_average',
      ])
      .getMany();

    // 2. 등급 분포 계산
    const rawDistribution = await this.gradesRepository
      .createQueryBuilder('grade')
      .select('grade.level', 'level') // 등급 필드가 level인 경우
      .addSelect('COUNT(*)', 'count')
      .leftJoin('grade.exam', 'exam')
      .where('grade.student_id = :studentId', { studentId })
      .andWhere('exam.exam_date BETWEEN :startDate AND :endDate', {
        startDate: start,
        endDate: end,
      })
      .groupBy('grade.level')
      .getRawMany();

    // 3. 누락된 등급 채우기 (A~F 기준)
    const distribution = Object.fromEntries(
      Object.values(Level).map((lv) => [lv, 0]),
    ) as Record<Level, number>;

    rawDistribution.forEach((row) => {
      const lv = String(row.level).toUpperCase() as Level;
      if (lv in distribution) distribution[lv] = parseInt(row.count, 10);
    });

    return {
      grades,
      gradeDistribution: distribution,
    };
  }

  //성적 상세 조회
  async getOneGrade(studentId: number, gradeId: number): Promise<Grade> {
    const grade = await this.gradesRepository.findOne({
      where: { studentId, gradeId },
      relations: { exam: true },
    });
    if (!grade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.ERROR.NOT_FOUND);
    }
    return grade;
  }

  // 성적 현황 조회
  async getCurrentGrades(studentId: number) {
    // 학생 이름 추출
    const existedStudent = await this.studentsRepository.findOne({
      where: { studentId },
      relations: { user: true },
      select: { studentId: true, user: { name: true } },
    });
    if (!existedStudent) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }

    // 최근 시험 날짜 기준으로 level만 정렬 조회
    const grades = await this.gradesRepository
      .createQueryBuilder('grade')
      .innerJoin('grade.exam', 'exam') // exam 없으면 제외(원하면 leftJoin)
      .where('grade.student_id = :studentId', { studentId })
      .select(['grade.level']) // level만 필요
      .orderBy('exam.exam_date', 'DESC')
      .getMany();

    return {
      studentName: existedStudent.user.name,
      grades: grades.map((grade) => grade.level),
    };
  }

  // 학생 목록 조회
  async findAllStudents(options?: IPaginationOptions, status?: string) {
    const where: FindOptionsWhere<User> = {
      role: Role.STUDENT,
    };
    const allowed = new Set(['approved', 'pending']);
    if (status && !allowed.has(status)) {
      throw new BadRequestException(
        MESSAGES.ADMIN.STUDENT.ERROR.LIST.INVALID_STATUS,
      );
    }
    if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'pending') {
      where.isApproved = false;
    }
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.student', 'student')
      .orderBy('user.createdAt', 'DESC')
      .where(where);
    return paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      relations: { student: true },
      where,
      select: {
        userId: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isApproved: true,
        createdAt: true,
        student: {
          studentId: true,
          grade: true,
          school: true,
        },
      },
    });
  }

  // 학생 상세 조회
  async findOneStudent(studentId: number) {
    const student = await this.studentsRepository.findOne({
      where: { studentId },
      relations: { user: true, parent: true },
      select: {
        studentId: true,
        grade: true,
        school: true,
        parentId: true,
        user: { userId: true, name: true, email: true, isApproved: true },
      },
    });
    if (!student) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    return student;
  }
}
