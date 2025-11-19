import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Notice } from './entities/notice.entity';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { MESSAGES } from '../constants/message.constant';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { Exam } from './entities/exam.entity';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class AdminService {
  @InjectRepository(Notice)
  private readonly noticeRepository: Repository<Notice>;
  @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>;
  @InjectRepository(Exam) private readonly examRepository: Repository<Exam>;

  // 공지사항 생성
  async createNotice(userId: number, { title, content }: CreateNoticeDto) {
    const adminConfirmed = await this.adminRepository.findOneBy({
      userId,
    });
    if (!adminConfirmed) {
      throw new BadRequestException(MESSAGES.ADMIN.NOTICE.UNAUTHORIZED.CREATED);
    }
    const { adminId } = adminConfirmed;
    const notice = this.noticeRepository.save({
      title,
      content,
      adminId,
    });
    return notice;
  }

  // 공지사항 전체 조회
  async findAllNotices(
    options?: IPaginationOptions,
  ): Promise<Pagination<Notice>> {
    const notices = await paginate(this.noticeRepository, options, {
      order: { createdAt: 'DESC' },
    });
    return notices;
  }

  // 공지사항 상세 조회
  async findNotice(noticeId: number) {
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(
        MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.NOT_EXISTED,
      );
    }
    return existedNotice;
  }

  // 공지사항 수정
  async updateNotice(
    userId: number,
    noticeId: number,
    { title, content }: UpdateNoticeDto,
  ) {
    //유효성 검증
    //1. 어드민 자격 검증
    const adminConfirmed = await this.adminRepository.findOneBy({ userId });
    if (!adminConfirmed) {
      throw new BadRequestException(MESSAGES.ADMIN.NOTICE.UNAUTHORIZED.UPDATED);
    }
    //2. 해당 공지사항이 존재하는지 검증
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(
        MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.NOT_EXISTED,
      );
    }
    //3. 변경된 내용이 없을 경우
    const sameNotice =
      existedNotice.title === title && existedNotice.content === content;
    if (sameNotice) {
      throw new BadRequestException(MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.SAME);
    }

    await this.noticeRepository.update({ noticeId }, { title, content }); // 업데이트 쿼리만 실행

    //다시 조회함으로써 엔티티 반영한 정보를 리턴
    const updateNotice = await this.noticeRepository.findOneBy({ noticeId });
    return updateNotice;
  }

  // 공지사항 삭제
  async deleteNotice(userId: number, noticeId: number) {
    const adminConfirmed = await this.adminRepository.findOneBy({ userId });
    if (!adminConfirmed) {
      throw new BadRequestException(MESSAGES.ADMIN.NOTICE.UNAUTHORIZED.DELETED);
    }
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(
        MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.NOT_EXISTED,
      );
    }
    const notice = await this.noticeRepository.delete(noticeId);

    return notice;
  }

  //시험일정 생성
  async createExam(
    userId: number,
    { year, semester, exam_date }: CreateExamDto,
  ) {
    const adminConfirmed = await this.adminRepository.findOneBy({ userId });
    if (!adminConfirmed) {
      throw new BadRequestException(MESSAGES.ADMIN.EXAM.UNAUTHORIZED.CREATED);
    }
    const { adminId } = adminConfirmed;
    const exam = await this.examRepository.save({
      year,
      semester,
      exam_date,
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
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.NOT_EXISTED);
    }
    return existedExam;
  }

  //시험일정 수정
  async updateExam(
    userId: number,
    examId: number,
    { year, semester, exam_date }: UpdateExamDto,
  ) {
    //1.어드민인지
    const adminConfirmed = await this.adminRepository.findOneBy({ userId });
    if (!adminConfirmed) {
      throw new BadRequestException(MESSAGES.ADMIN.EXAM.UNAUTHORIZED.CREATED);
    }
    //2.존재하는 시험일정인지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.NOT_EXISTED);
    }
    const sameExam =
      existedExam.year === year &&
      existedExam.semester === semester &&
      existedExam.exam_date === exam_date;
    //3.변경된 내용이 없는 경우
    if (sameExam) {
      throw new BadRequestException(MESSAGES.ADMIN.EXAM.UPDATE.SAME);
    }
    await this.examRepository.update({ examId }, { year, semester, exam_date });

    const updatedExam = await this.examRepository.findOneBy({ examId });
    return updatedExam;
  }
}
