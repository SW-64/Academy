// grades.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grade } from './entities/grade.entity';
import { Student } from '../students/entities/student.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Exam } from '../exam/entities/exam.entity';
import { MESSAGES } from './../constants/message.constant';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
  ) {}

  /**
   * 학생 본인 시험점수 전체조회
   */
  async getStudentGrade(
    classId: number,
    userIdOfStudent: number,
    sortOption: string,
  ) {
    // 1. 학생 정보 조회
    const student = await this.studentRepository.findOne({
      where: { userId: userIdOfStudent },
      select: { studentId: true },
    });

    if (!student) {
      throw new NotFoundException(MESSAGES.STUDENTS.ERROR.NOT_FOUND);
    }

    // 2. 정렬 옵션 설정
    const orderOption =
      sortOption === 'score_desc'
        ? { 'grades.score': 'DESC' as const }
        : { examDate: 'ASC' as const };

    // 3. 성적 조회 (정렬 적용)
    const gradesOfExam = await this.examRepository.find({
      where: {
        classId,
        grades: {
          studentId: student.studentId,
        },
      },
      select: {
        examId: true,
        examTitle: true,
        examDate: true,
        grades: {
          gradeId: true,
          studentId: true,
          score: true,
          level: true,
          comment: true,
          isTaken: true,
        },
      },
      order: orderOption,
      relations: ['grades'],
    });

    return gradesOfExam;
  }

  /**
   * 학부모가 자녀 성적 조회
   */
  async getStudentGradeByParent(
    classId: number,
    userIdOfParent: number,
    studentId: number,
    sortOption: string,
  ) {
    // 1. 학부모 정보 조회
    const parent = await this.parentRepository.findOne({
      where: { userId: userIdOfParent },
      select: { parentId: true },
    });
    if (!parent) {
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }

    // 2. 학부모의 자녀 정보 조회
    const student = await this.studentRepository.findOne({
      where: {
        studentId,
        parentId: parent.parentId,
      },
      select: {
        studentId: true,
      },
    });
    if (!student) {
      throw new ForbiddenException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }

    // 3. 자녀 성적 조회 (정렬 적용)
    const orderOption =
      sortOption === 'score_desc'
        ? { 'grades.score': 'DESC' as const }
        : { examDate: 'ASC' as const };

    const gradesOfExam = await this.examRepository.find({
      where: {
        classId,
        grades: {
          studentId: student.studentId,
        },
      },
      select: {
        examId: true,
        examTitle: true,
        examDate: true,
        grades: {
          gradeId: true,
          studentId: true,
          score: true,
          level: true,
          comment: true,
          isTaken: true,
        },
      },
      order: orderOption,
      relations: ['grades'],
    });

    return gradesOfExam;
  }

  /**
   * 학생 본인 시험 등수 조회
   */
  async getMyRank(classId: number, examId: number, userIdOfStudent: number) {
    // 1. 학생 정보 조회
    const student = await this.studentRepository.findOne({
      where: { userId: userIdOfStudent },
      select: { studentId: true },
    });

    if (!student) {
      throw new NotFoundException(MESSAGES.STUDENTS.ERROR.NOT_FOUND);
    }

    // 2. 시험 정보 조회
    const exam = await this.examRepository.existsBy({
      examId,
      classId,
    });
    if (!exam) {
      throw new NotFoundException(MESSAGES.STUDENTS.GRADE.ERROR.NO_EXAM);
    }

    // 3. 등수 조회 (모든 학생)
    const ranks = await this.gradeRepository.find({
      where: { examId, isTaken: true }, // ← 응시한 학생만
      relations: ['student', 'student.user'],
      select: {
        gradeId: true,
        studentId: true,
        score: true,
        isTaken: true,
        ranking: true,
        student: {
          studentId: true,
          user: {
            userId: true,
            name: true,
          },
        },
      },
      order: {
        ranking: 'ASC', // ← 등수 순으로 정렬
      },
    });

    // 4. 개인정보 보호: 본인만 이름 표시
    const maskedRanks = ranks.map((grade) => {
      const isMe = grade.studentId === student.studentId;

      return {
        ranking: grade.ranking,
        score: grade.score,
        isTaken: grade.isTaken,
        isMe: isMe,
        // 본인이면 studentId와 name 표시, 아니면 null
        studentId: isMe ? grade.studentId : null,
        name: isMe ? grade.student?.user?.name : null,
      };
    });

    return maskedRanks;
  }

  /**
   * 학부모 - 자녀의 시험 등수 조회
   */
  async getMyStudentRank(
    classId: number,
    examId: number,
    userIdOfParent: number,
    studentId,
  ) {
    // 1. 학부모 정보 조회
    const parent = await this.parentRepository.findOne({
      where: { userId: userIdOfParent },
      select: { parentId: true },
    });
    if (!parent) {
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }
    // 2. 학부모의 자녀 정보 조회
    const student = await this.studentRepository.findOne({
      where: {
        studentId,
        parentId: parent.parentId, // ← 자녀 관계 검증
      },
      select: {
        studentId: true,
      },
    });
    if (!student) {
      throw new ForbiddenException('해당 학생은 자녀가 아닙니다');
    }

    // 3. 시험 정보 조회
    const exam = await this.examRepository.existsBy({
      examId,
      classId,
    });
    if (!exam) {
      throw new NotFoundException(MESSAGES.PARENTS.GRADE.ERROR.NO_EXAM);
    }

    // 4. 등수 조회 (모든 학생)
    const ranks = await this.gradeRepository.find({
      where: { examId, isTaken: true }, // ← 응시한 학생만
      relations: ['student', 'student.user'],
      select: {
        gradeId: true,
        studentId: true,
        score: true,
        isTaken: true,
        ranking: true,
        student: {
          studentId: true,
          user: {
            userId: true,
            name: true,
          },
        },
      },
      order: {
        ranking: 'ASC', // ← 등수 순으로 정렬
      },
    });

    // 5. 개인정보 보호: 자녀만 이름 표시
    const maskedRanks = ranks.map((grade) => {
      const isMyChild = grade.studentId === student.studentId;

      return {
        ranking: grade.ranking,
        score: grade.score,
        isTaken: grade.isTaken,
        isMe: isMyChild,
        // 자녀이면 studentId와 name 표시, 아니면 null
        studentId: isMyChild ? grade.studentId : null,
        name: isMyChild ? grade.student?.user?.name : null,
      };
    });

    return maskedRanks;
  }
}
