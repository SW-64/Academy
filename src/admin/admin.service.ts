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
import { Role, User } from '../users/entities/user.entity';
import { Student } from './../students/entities/student.entity';
import { Parent } from './../parents/entities/parent.entity';
import { CreateGradeDto } from './dto/create-grades.dto';
import { Grade } from './entities/grade.entity';

@Injectable()
export class AdminService {
  @InjectRepository(Notice)
  private readonly noticeRepository: Repository<Notice>;
  @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>;
  @InjectRepository(Exam) private readonly examRepository: Repository<Exam>;
  @InjectRepository(User) private readonly userRepository: Repository<User>;
  @InjectRepository(Student)
  private readonly studentRepository: Repository<Student>;
  @InjectRepository(Parent)
  private readonly parentRepository: Repository<Parent>;
  @InjectRepository(Grade)
  private readonly gradeRepository: Repository<Grade>;

  // 공지사항 생성
  async createNotice(userId: number, { title, content }: CreateNoticeDto) {
    const { adminId } = await this.adminRepository.findOneBy({ userId });
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
  async updateNotice(noticeId: number, { title, content }: UpdateNoticeDto) {
    //1. 해당 공지사항이 존재하는지 검증
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(
        MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.NOT_EXISTED,
      );
    }
    //2. 변경된 내용이 없을 경우
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
  async deleteNotice(noticeId: number) {
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
    const { adminId } = await this.adminRepository.findOneBy({ userId });
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
    examId: number,
    { year, semester, exam_date }: UpdateExamDto,
  ) {
    //1.존재하는 시험일정인지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.NOT_EXISTED);
    }
    const sameExam =
      existedExam.year === year &&
      existedExam.semester === semester &&
      existedExam.exam_date === exam_date;
    //2.변경된 내용이 없는 경우
    if (sameExam) {
      throw new BadRequestException(MESSAGES.ADMIN.EXAM.UPDATE.SAME);
    }
    await this.examRepository.update({ examId }, { year, semester, exam_date });

    const updatedExam = await this.examRepository.findOneBy({ examId });
    return updatedExam;
  }

  //시험일정 삭제
  async deleteExam(examId: number) {
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.NOT_EXISTED);
    }
    const exam = await this.examRepository.delete(examId);
    return exam;
  }

  // 학생 목록 조회
  async findAllStudents(options?: IPaginationOptions, status?: string) {
    const statusText = 'approved';
    const students = await paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      where: { isApproved: status == statusText, role: Role.STUDENT },
    });

    return students;
  }

  // 학생 상세 조회
  async findOneStudent(studentId: number) {
    const student = await this.studentRepository.findOneBy({
      studentId: studentId,
    });
    if (!student) {
      throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
    }
    return student;
  }

  // 학부모 목록 조회
  async findAllParents(options?: IPaginationOptions, status?: string) {
    const statusText = 'approved';
    const parents = await paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      where: { isApproved: status == statusText, role: Role.PARENT },
    });

    return parents;
  }

  // 학부모 상세 조회
  async findOneParent(parentId: number) {
    const parent = await this.parentRepository.findOneBy({
      parentId: parentId,
    });
    return parent;
  }

  // 유저 계정 승인
  async approveUserAccount(userId: number) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
    }
    user.isApproved = true;
    await this.userRepository.save(user);

    const student = await this.studentRepository.findOneBy({ userId });
    const parent = await this.parentRepository.findOneBy({ userId });

    if (!student && user.role === Role.STUDENT) {
      await this.studentRepository.save({
        userId: user.userId,
        grade: user.signupGrade,
        school: user.signupSchool,
      });
    }

    if (!parent && user.role === Role.PARENT) {
      await this.parentRepository.save({
        userId: user.userId,
      });
    }

    return;
  }

  // 유저 계정 거부
  async rejectUserAccount(userId: number) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
    }
    user.isApproved = false;
    await this.userRepository.save(user);

    return;
  }

  //시험일정 생성
  async createGrade(
    examId: number,
    { studentId, subject, score }: CreateGradeDto,
  ) {
    //1.시험이 존재하는지
    const existedExam = await this.examRepository.findOneBy({ examId });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.NOT_EXISTED);
    }
    const existedStudent = await this.studentRepository.findOneBy({
      studentId,
    });
    //2.등록되어있는 학생인지
    if (!existedStudent) {
      throw new NotFoundException(MESSAGES.ADMIN.STUDENT.NOT_EXISTED);
    }
    //3.이미 등록되어 있는 경우
    const existdata = await this.gradeRepository.findOne({
      where: { examId, studentId },
    });
    if (existdata) {
      throw new BadRequestException(MESSAGES.ADMIN.GRADE.EXISTED);
    }
    const grade = await this.gradeRepository.save({
      studentId,
      subject,
      score,
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
}
