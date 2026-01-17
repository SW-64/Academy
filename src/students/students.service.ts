import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { FindOptionsWhere, Repository } from 'typeorm';

import { MESSAGES } from '../constants/message.constant';

import { startOfMonth, addMonths } from 'date-fns';

import { Role, Status, User } from '../users/entities/user.entity';
import { Grade, Level } from '../grades/entities/grade.entity';
import { Student } from './entities/student.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(Grade)
    private readonly gradesRepository: Repository<Grade>,
    @InjectRepository(StudentClass)
    private readonly studentClassRepository: Repository<StudentClass>,
  ) {}

  async getAllGrades(studentId: number, year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1; // 1~12

    const start = startOfMonth(new Date(y, m - 1));
    const nextStart = startOfMonth(addMonths(start, 1));
    // 1. 성적 목록 조회
    const grades = await this.gradesRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.exam', 'exam')
      .where('grade.student_id = :studentId', { studentId })
      .andWhere('exam.exam_date >= :start', { start })
      .andWhere('exam.exam_date < :nextStart', { nextStart })
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
      .select('grade.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('grade.exam', 'exam')
      .where('grade.student_id = :studentId', { studentId })
      .andWhere('exam.exam_date >= :start', { start })
      .andWhere('exam.exam_date < :nextStart', { nextStart })
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
  async findAllStudents(options?: IPaginationOptions) {
    const where: FindOptionsWhere<User> = {
      role: Role.STUDENT,
      status: Status.approved,
    };

    return paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      relations: ['student', 'student.parent', 'student.parent.user'],
      where,
      select: {
        userId: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        student: {
          studentId: true,
          grade: true,
          school: true,
          parent: {
            parentId: true,
            user: {
              userId: true,
              name: true,
            },
          },
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
        user: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          status: true,
        },
      },
    });
    if (!student) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    return student;
  }

  // 학생 홈화면 조회
  async getStudentHome(userId: number) {
    const student = await this.studentsRepository.findOne({
      where: { userId },
      relations: { user: true },
      select: {
        studentId: true,
        grade: true,
        school: true,
        user: { userId: true, name: true },
      },
    });
    if (!student) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    return student;
  }

  // 내가 속한 클래스 조회 (학생)
  async getMyClasses(userId: number) {
    const student = await this.studentsRepository.findOneBy({ userId });
    if (!student) {
      throw new NotFoundException(MESSAGES.STUDENTS.ERROR.NOT_FOUND);
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
