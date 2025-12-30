import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { Repository } from 'typeorm';

import { MESSAGES } from '../constants/message.constant';

import { Exam } from '../exam/entities/exam.entity';
import { Student } from '../students/entities/student.entity';
import { Grade, Level } from './entities/grade.entity';

import { CreateGradeDto } from './dto/create-grades.dto';
import { UpdateGradeDto } from './dto/update-grades.dto';
import { Status } from '../users/entities/user.entity';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
  ) {}

  //시험점수 생성
  async createGrade(
    examId: number,
    { studentId, score, comment }: CreateGradeDto,
  ) {
    //1.해당 시험 일정이 존재하는지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    //2.DB에 등록되어있는 학생인지
    const existedStudent = await this.studentRepository.findOne({
      where: { studentId },
      relations: { user: true },
      select: { studentId: true, user: { status: true } },
    });

    if (!existedStudent) {
      throw new NotFoundException(MESSAGES.ADMIN.STUDENT.ERROR.NOT_FOUND);
    }
    if (existedStudent.user.status !== Status.approved) {
      throw new BadRequestException(
        MESSAGES.ADMIN.GRADE.ERROR.STUDENT_NOT_APPROVED,
      );
    }
    //3.시험점수가 이미 등록되어 있는 경우
    const existedGrade = await this.gradeRepository.findOne({
      where: { examId, studentId },
    });
    if (existedGrade) {
      throw new BadRequestException(MESSAGES.ADMIN.GRADE.ERROR.ALREADY_EXISTS);
    }

    //4. 시험점수 생성
    const level = this.calculateLevel(score);
    const grade = await this.gradeRepository.save({
      examId,
      studentId,
      score,
      level,
      comment: comment ?? null,
    });
    return grade;
  }

  //시험점수 전체조회
  async getAllGrades(
    examId: number,
    sortOption: 'score_desc' | 'name_asc',
    options?: IPaginationOptions,
  ): Promise<Pagination<Grade>> {
    const qb = this.gradeRepository
      .createQueryBuilder('grade')
      .where('grade.exam_id = :examId', { examId });

    // 공통: 필요한 컬럼만 선택 (성능/보안)
    // 여기서 필요한 컬럼은 너 UI에 맞게 조절해.
    qb.select([
      'grade.gradeId',
      'grade.examId',
      'grade.studentId',
      'grade.score',
      'grade.level',
    ]);

    switch (sortOption) {
      case 'score_desc': {
        qb.orderBy('grade.score', 'DESC').addOrderBy('grade.gradeId', 'DESC'); // 동점일 때 정렬 안정화
        break;
      }

      case 'name_asc': {
        qb.leftJoin('grade.student', 'student').leftJoin(
          'student.user',
          'user',
        );

        qb.addSelect(['student.studentId', 'user.userId', 'user.name']);

        qb.orderBy('user.name', 'ASC').addOrderBy('grade.gradeId', 'DESC'); // 동명이인/동일이름 안정화
        break;
      }

      default:
        qb.orderBy('grade.gradeId', 'DESC');
    }

    return paginate<Grade>(qb, options);
  }

  //시험점수 상세조회
  async getGrade(examId: number, gradeId: number) {
    const grade = await this.gradeRepository.findOne({
      where: { examId, gradeId },
    });
    if (!grade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.ERROR.NOT_FOUND);
    }
    return grade;
  }

  //시험점수 수정
  async updateGrade(
    examId: number,
    gradeId: number,
    { score, comment }: UpdateGradeDto,
  ) {
    //1.시험일정 존재하는지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    //2.시험성적 존재하는지
    const existedGrade = await this.gradeRepository.findOne({
      where: { examId, gradeId },
    });
    if (!existedGrade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.ERROR.NOT_FOUND);
    }
    //3.내용이 동일한 경우
    const patch: Partial<Grade> = {};
    if (comment !== undefined) patch.comment = comment;
    if (score !== undefined) {
      patch.score = score;
      patch.level = this.calculateLevel(score);
    }

    if (Object.keys(patch).length === 0)
      throw new BadRequestException(
        MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.NO_CHANGES,
      );

    await this.gradeRepository.update({ examId, gradeId }, patch);

    return;
  }

  //시험점수 삭제
  async deleteGrade(examId: number, gradeId: number) {
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    const existedGrade = await this.gradeRepository.findOne({
      where: { examId, gradeId },
    });
    if (!existedGrade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.ERROR.NOT_FOUND);
    }
    await this.gradeRepository.delete({ examId, gradeId });
    return;
  }

  // 등급계산
  private calculateLevel(score: number): Level {
    if (score >= 90) {
      return Level.A;
    } else if (score >= 80) {
      return Level.B;
    } else if (score >= 70) {
      return Level.C;
    } else if (score >= 60) {
      return Level.D;
    } else {
      return Level.F;
    }
  }
}
