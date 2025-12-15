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
import { Grade } from './entities/grade.entity';

import { CreateGradeDto } from './dto/create-grades.dto';
import { UpdateGradeDto } from './dto/update-grades.dto';
import e from 'express';

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
    { studentId, score, level, comment }: CreateGradeDto,
  ) {
    //1.해당 시험 일정이 존재하는지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    const existedStudent = await this.studentRepository.findOneBy({
      studentId,
    });
    //2.DB에 등록되어있는 학생인지
    if (!existedStudent) {
      throw new NotFoundException(MESSAGES.ADMIN.STUDENT.ERROR.NOT_FOUND);
    }
    //3.시험점수가 이미 등록되어 있는 경우
    const existdata = await this.gradeRepository.findOne({
      where: { examId, studentId },
    });
    if (existdata) {
      throw new BadRequestException(MESSAGES.ADMIN.GRADE.ERROR.ALREADY_EXISTS);
    }
    const grade = await this.gradeRepository.save({
      studentId,
      score,
      level,
      comment,
      examId,
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
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.ERROR.NOT_FOUND);
    }
    return grade;
  }

  //시험점수 수정
  async updateGrade(
    examId: number,
    gradeId: number,
    { studentId, score, level, comment }: UpdateGradeDto,
  ) {
    //1.시험일정 존재하는지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    //2.시험성적 존재하는지
    const existedGrade = await this.gradeRepository.findOneBy({ gradeId });
    if (!existedGrade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.ERROR.NOT_FOUND);
    }
    //3.내용이 동일한 경우
    const sameGrade =
      existedGrade.studentId === studentId &&
      existedGrade.score === score &&
      existedGrade.level === level &&
      existedGrade.comment === comment;
    if (sameGrade) {
      throw new BadRequestException(
        MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.NO_CHANGES,
      );
    }

    await this.gradeRepository.update({ gradeId }, { studentId, score });
    const updateGrade = await this.gradeRepository.findOneBy({ gradeId });
    return updateGrade;
  }

  //시험점수 삭제
  async deleteGrade(examId: number, gradeId: number) {
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    const existedGrade = await this.gradeRepository.findOneBy({ gradeId });
    if (!existedGrade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.ERROR.NOT_FOUND);
    }
    const grade = await this.gradeRepository.delete(gradeId);
    return grade;
  }
}
