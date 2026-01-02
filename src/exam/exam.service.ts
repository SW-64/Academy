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
import { In, Repository } from 'typeorm';

import { Admin } from '../admin/entities/admin.entity';
import { Grade } from '../grades/entities/grade.entity';
import { Exam } from './entities/exam.entity';

import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

import { MESSAGES } from '../constants/message.constant';
import { ActionLog } from './../action-logs/entities/action-logs.entity';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
  ) {}

  //시험일정 생성
  async createExam(
    { year, examTitle, examDate }: CreateExamDto,
    adminId: number,
  ) {
    const exam = await this.examRepository.save({
      year,
      examTitle,
      examDate,
    });

    // 로그 생성
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'CREATE_EXAM',
      targetType: 'exam',
      targetId: exam.examId,
      description: `Admin created an exam (examId: ${exam.examId})`,
      createdAt: new Date(),
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
    { year, examTitle, examDate }: UpdateExamDto,
    adminId: number,
  ) {
    //1.존재하는 시험일정인지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }

    const patch: Partial<Exam> = {};
    if (year !== undefined) patch.year = year;
    if (examTitle !== undefined) patch.examTitle = examTitle;
    if (examDate !== undefined) patch.examDate = examDate;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException(
        MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.NO_CHANGES,
      );
    }
    await this.examRepository.update({ examId }, patch);

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'UPDATE_EXAM',
      targetType: 'exam',
      targetId: examId,
      description: `Admin updated an exam (examId: ${examId})`,
      changes: patch,
      createdAt: new Date(),
    });
    return;
  }

  //시험일정 삭제
  async deleteExam(examId: number, adminId: number) {
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    await this.examRepository.softDelete(examId);

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'DELETE_EXAM',
      targetType: 'exam',
      targetId: examId,
      description: `Admin deleted an exam (examId: ${examId})`,
      createdAt: new Date(),
    });
    return;
  }

  // 전체 학생 평균 생성
  async createExamAverage(examId: number, adminId: number) {
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }

    // DB에서 평균/개수만 계산해서 가져오기
    const row = await this.gradeRepository
      .createQueryBuilder('g')
      .select('COUNT(g.grade_id)', 'cnt')
      .addSelect('AVG(g.score)', 'avg')
      .where('g.exam_id = :examId', { examId })
      // 소프트딜리트 쓸 거면 아래 조건도 같이
      // .andWhere('g.deleted_at IS NULL')
      .getRawOne<{ cnt: string; avg: string | null }>();

    const cnt = Number(row?.cnt ?? 0);
    if (cnt === 0) {
      throw new BadRequestException(MESSAGES.ADMIN.GRADE.ERROR.NO_GRADES);
    }

    // AVG는 DB/드라이버에 따라 문자열로 올 수 있어서 숫자 변환/반올림 처리
    const avgNumber = Number(row.avg);
    const average = avgNumber.toFixed(2); // "86.50"

    existedExam.studentAverage = average;
    await this.examRepository.update({ examId }, { studentAverage: average });

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'CREATE_EXAM_AVERAGE',
      targetType: 'exam',
      targetId: examId,
      description: `Admin created exam average (examId: ${examId}, average: ${average})`,
      createdAt: new Date(),
    });
    return existedExam;
  }
}
