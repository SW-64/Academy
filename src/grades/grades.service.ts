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

@Injectable()
export class GradesService {
  @InjectRepository(Exam)
  private readonly examRepository: Repository<Exam>;
  @InjectRepository(Student)
  private readonly studentRepository: Repository<Student>;
  @InjectRepository(Grade)
  private readonly gradeRepository: Repository<Grade>;

  //시험점수 생성
  async createGrade(
    examId: number,
    { studentId, score, comment }: CreateGradeDto,
  ) {
    //1.해당 시험 일정이 존재하는지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.NOT_EXISTED);
    }
    const existedStudent = await this.studentRepository.findOneBy({
      studentId,
    });
    //2.DB에 등록되어있는 학생인지
    if (!existedStudent) {
      throw new NotFoundException(MESSAGES.ADMIN.STUDENT.NOT_EXISTED);
    }
    //3.시험점수가 이미 등록되어 있는 경우
    const existedGrade = await this.gradeRepository.findOne({
      where: { examId, studentId },
    });
    if (existedGrade) {
      throw new BadRequestException(MESSAGES.ADMIN.GRADE.EXISTED);
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

  //시험점수 조회
  async getAllGrades(
    examId: number,
    options?: IPaginationOptions,
  ): Promise<Pagination<Grade>> {
    const grades = await paginate(this.gradeRepository, options, {
      where: { examId },
      order: { createdAt: 'DESC' },
    });
    return grades;
  }

  //시험점수 상세조회
  async getGrade(examId: number, gradeId: number) {
    const grade = await this.gradeRepository.findOne({
      where: { examId, gradeId },
    });
    if (!grade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.NOT_EXISTED);
    }
    return grade;
  }

  //시험점수 수정
  async updateGrade(
    examId: number,
    gradeId: number,
    { studentId, score, comment }: UpdateGradeDto,
  ) {
    //1.시험일정 존재하는지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.NOT_EXISTED);
    }
    //2.시험성적 존재하는지
    const existedGrade = await this.gradeRepository.findOne({
      where: { examId, gradeId },
    });
    if (!existedGrade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.NOT_EXISTED);
    }
    //3.내용이 동일한 경우
    const patch: Partial<Grade> = {};
    if (studentId !== undefined) patch.studentId = studentId;
    if (comment !== undefined) patch.comment = comment;
    if (score !== undefined) {
      patch.score = score;
      patch.level = this.calculateLevel(score);
    }

    if (Object.keys(patch).length === 0)
      throw new BadRequestException(MESSAGES.ADMIN.GRADE.UPDATE.SAME);

    await this.gradeRepository.update({ examId, gradeId }, patch);

    return;
  }

  //시험점수 삭제
  async deleteGrade(examId: number, gradeId: number) {
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.NOT_EXISTED);
    }
    const existedGrade = await this.gradeRepository.findOne({
      where: { examId, gradeId },
    });
    if (!existedGrade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.NOT_EXISTED);
    }
    const grade = await this.gradeRepository.delete({ examId, gradeId });
    return grade;
  }

  // 등급계산
  calculateLevel(score: number): Level {
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
