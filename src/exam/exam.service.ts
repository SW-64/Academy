import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Admin } from '../admin/entities/admin.entity';
import { Grade } from '../grades/entities/grade.entity';
import { Exam } from './entities/exam.entity';

import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

import { MESSAGES } from '../constants/message.constant';

@Injectable()
export class ExamService {
  @InjectRepository(Admin)
  private readonly adminRepository: Repository<Admin>;
  @InjectRepository(Exam)
  private readonly examRepository: Repository<Exam>;
  @InjectRepository(Grade)
  private readonly gradeRepository: Repository<Grade>;

  //시험일정 생성
  async createExam(
    userId: number,
    { year, exam_title, exam_date, student_average }: CreateExamDto,
  ) {
    const { adminId } = await this.adminRepository.findOneBy({ userId });
    const exam = await this.examRepository.save({
      year,
      exam_title,
      exam_date,
      student_average,
      adminId,
    });

    return exam;
  }

  //시험일정 전체조회
  async findAllExams(options?: IPaginationOptions): Promise<Pagination<Exam>> {
    const exams = await paginate(this.examRepository, options, {
      order: { createdAt: 'DESC' },
    });
    return exams;
  }

  //시험일정 상세조회
  async findExam(examId: number) {
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    return existedExam;
  }

  //시험일정 수정
  async updateExam(
    examId: number,
    { year, exam_title, exam_date, student_average }: UpdateExamDto,
  ) {
    //1.존재하는 시험일정인지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    const sameExam =
      existedExam.year === year &&
      existedExam.exam_title === exam_title &&
      existedExam.exam_date === exam_date &&
      existedExam.student_average === student_average;
    //2.변경된 내용이 없는 경우
    if (sameExam) {
      throw new BadRequestException(
        MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.NO_CHANGES,
      );
    }
    await this.examRepository.update(
      { examId },
      { year, exam_title, exam_date, student_average },
    );

    const updatedExam = await this.examRepository.findOneBy({ examId });
    return updatedExam;
  }

  //시험일정 삭제
  async deleteExam(examId: number) {
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    const exam = await this.examRepository.delete(examId);
    return exam;
  }

  // 전체 학생 평균 생성
  async createExamAverage(examId: number) {
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }

    // 점수 합산 및 평균 계산
    let totalScore = 0;
    const grades = await this.gradeRepository.find({ where: { examId } });
    if (grades.length === 0) {
      throw new BadRequestException(MESSAGES.ADMIN.GRADE.ERROR.NO_GRADES);
    }
    totalScore += grades.reduce((sum, grade) => sum + grade.score, 0);
    const average = parseFloat((totalScore / grades.length).toFixed(2));
    existedExam.student_average = average;
    await this.examRepository.save(existedExam);
    return existedExam;
  }
}
