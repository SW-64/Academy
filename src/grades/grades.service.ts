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
import { DUMMY_HERO_NAMES } from './../constants/dummy-hero-names.constant';
import { User } from './../users/entities/user.entity';

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    const queryBuilder = this.examRepository
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.grades', 'grade')
      .where('exam.classId = :classId', { classId })
      .andWhere('grade.studentId = :studentId', {
        studentId: student.studentId,
      })
      .select([
        'exam.examId',
        'exam.examTitle',
        'exam.examDate',
        'exam.studentAverage',
        'grade.gradeId',
        'grade.studentId',
        'grade.score',
        'grade.level',
        'grade.comment',
        'grade.isTaken',
      ]);

    // 정렬 옵션 적용
    if (sortOption === 'score_desc') {
      queryBuilder.orderBy('grade.score', 'DESC');
    } else {
      queryBuilder.orderBy('exam.examDate', 'ASC');
    }

    // 3. 성적 조회
    const gradesOfExam = await queryBuilder.getMany();

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
        studentAverage: true,
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
      relations: ['user'],
      select: {
        studentId: true,
        user: {
          userId: true,
          name: true,
        },
      },
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
      relations: ['student'],
      select: {
        gradeId: true,
        studentId: true,
        score: true,
        isTaken: true,
        ranking: true,
        student: {
          studentId: true,
          school: true,
        },
      },
      order: {
        ranking: 'ASC', // ← 등수 순으로 정렬
      },
    });

    const myIndex = ranks.findIndex((g) => g.studentId === student.studentId);
    const N = ranks.length;
    const aliases = DUMMY_HERO_NAMES.slice(0, N);

    if (ranks.length === 0) return [];

    // 4. 개인정보 보호: 본인만 이름 표시
    const maskedRanks = ranks.map((grade, i) => {
      const myRealName = student.user.name;
      const isMe = i === myIndex;
      const aliasName = aliases[i] ?? null; // 51등(인덱스 50)부터 null
      return {
        ranking: grade.ranking,
        score: grade.score,
        isTaken: grade.isTaken,
        isMe: isMe,
        school: grade.student.school,
        // 본인이면 studentId와 name 표시, 아니면 가명
        studentId: isMe ? grade.studentId : null,
        name: isMe ? myRealName : aliasName,
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
      relations: ['user'],
      select: {
        studentId: true,
        user: {
          userId: true,
          name: true,
        },
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

    const myStudentIndex = ranks.findIndex(
      (g) => g.studentId === student.studentId,
    );
    const N = ranks.length;
    const aliases = DUMMY_HERO_NAMES.slice(0, N);

    if (ranks.length === 0) return [];

    // 5. 개인정보 보호: 자녀만 이름 표시
    const maskedRanks = ranks.map((grade, i) => {
      const myStudentRealName = student.user.name;
      const isMyStudent = i === myStudentIndex;
      const aliasName = aliases[i] ?? null; // 51등(인덱스 50)부터 null

      return {
        ranking: grade.ranking,
        score: grade.score,
        isTaken: grade.isTaken,
        isMyStudent: isMyStudent,
        school: grade.student.school,
        // 자녀이면 studentId와 name 표시, 아니면 null
        studentId: isMyStudent ? grade.studentId : null,
        name: isMyStudent ? myStudentRealName : aliasName,
      };
    });

    return maskedRanks;
  }
}
