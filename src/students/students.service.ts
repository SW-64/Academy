import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { FindOptionsWhere, Repository } from 'typeorm';

import { MESSAGES } from '../constants/message.constant';

import { startOfMonth, endOfMonth } from 'date-fns';

import { Role, User } from '../users/entities/user.entity';
import { Grade } from '../grades/entities/grade.entity';
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
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // 1. 성적 목록 조회
    const grades = await this.gradesRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.exam', 'exam')
      .where('grade.student_id = :studentId', { studentId })
      .andWhere('exam.exam_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
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
        startDate,
        endDate,
      })
      .groupBy('grade.level')
      .getRawMany();

    // 3. 누락된 등급 채우기 (A~F 기준)
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    rawDistribution.forEach((row) => {
      const level = row.level?.toUpperCase();
      if (distribution.hasOwnProperty(level)) {
        distribution[level] = parseInt(row.count, 10);
      }
    });

    return {
      grades,
      gradeDistribution: distribution,
    };
  }

  //성적 상세 조회
  async getOneGrade(studentId: number, gradeId: number): Promise<Grade> {
    const existGrade = await this.gradesRepository.findOneBy({ gradeId });
    if (!existGrade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.ERROR.NOT_FOUND);
    }
    const grade = await this.gradesRepository.findOne({
      where: { studentId: studentId, gradeId: gradeId },
      relations: ['exam'],
    });
    return grade;
  }

  // 성적 현황 조회
  async getCurrentGrades(studentId: number) {
    // 학생 이름 추출
    const existStudent = await this.studentsRepository.findOneBy({ studentId });
    if (!existStudent) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }

    // 학생 등급 추출
    const grades = await this.gradesRepository.find({
      where: { studentId: studentId },
      relations: ['exam'],
      order: { exam: { exam_date: 'DESC' } },
      select: { level: true },
    });

    return {
      studentName: existStudent.user.name,
      grades: grades.map((grade) => grade.level),
    };
  }

  // 학생 목록 조회
  async findAllStudents(options?: IPaginationOptions, status?: string) {
    const where: FindOptionsWhere<User> = {
      role: Role.STUDENT,
    };

    if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'pending') {
      where.isApproved = false;
    }

    return paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      where,
    });
  }

  // 학생 상세 조회
  async findOneStudent(studentId: number) {
    const student = await this.studentsRepository.findOneBy({
      studentId: studentId,
    });
    if (!student) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    return student;
  }
}
