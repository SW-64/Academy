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
import { DataSource, In, Repository } from 'typeorm';

import { Admin } from '../admin/entities/admin.entity';
import { Grade } from '../grades/entities/grade.entity';
import { Exam } from './entities/exam.entity';

import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

import { MESSAGES } from '../constants/message.constant';
import { ActionLog } from './../action-logs/entities/action-logs.entity';
import { ExamDetail } from './entities/exam-detail.entity';
import { Student } from './../students/entities/student.entity';
import { GradeWrongAnswer } from '../grades/entities/grade-wrong-answer.entity';
import { ReplaceWrongAnswersDto } from './dto/wrong-answer-patch.dto';

@Injectable()
export class ExamService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
    @InjectRepository(ExamDetail)
    private readonly examDetailRepository: Repository<ExamDetail>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(GradeWrongAnswer)
    private readonly gradeWrongAnswerRepository: Repository<GradeWrongAnswer>,
  ) {}

  //시험일정 생성
  async createExam(
    { examTitle, examDate, question, points }: CreateExamDto,
    adminId: number,
    classId: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const examRepo = manager.getRepository(Exam);
      const examDetailRepo = manager.getRepository(ExamDetail);
      const actionLogRepo = manager.getRepository(ActionLog);

      // 1) Exam 생성
      const exam = await examRepo.save(
        examRepo.create({
          classId,
          examTitle,
          examDate: new Date(`${examDate}T00:00:00+09:00`),
        }),
      );

      // 2) ExamDetail 생성(옵션)
      const hasQuestions = Array.isArray(question);
      const hasPoints = Array.isArray(points);

      if (hasQuestions || hasPoints) {
        if ((question?.length ?? 0) !== (points?.length ?? 0)) {
          throw new BadRequestException(
            MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.EXAM_QUESTION_POINTS_LENGTH_MISMATCH,
          );
        }

        // length === 0도 OK ( 빈 배열 허용 )
        if (hasQuestions && question.length > 0) {
          const details = question!.map((q, idx) => ({
            examId: exam.examId,
            question: q,
            points: points![idx],
            errorRate: null,
          }));

          await examDetailRepo.insert(details);
        }
      }

      // 3) 로그
      await actionLogRepo.save(
        actionLogRepo.create({
          actorId: adminId,
          actorType: 'admin',
          action: 'CREATE_EXAM',
          targetType: 'exam',
          targetId: exam.examId,
          description: `Admin created an exam (examId: ${exam.examId})`,
          createdAt: new Date(),
        }),
      );

      return;
    });
  }

  //시험일정 전체조회
  async findAllExams(
    classId: number,
    options?: IPaginationOptions,
  ): Promise<Pagination<Exam>> {
    const exams = await paginate(this.examRepository, options, {
      order: { createdAt: 'DESC' },
      where: { classId },
      select: {
        examId: true,
        examTitle: true,
        examDate: true,
        studentAverage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return exams;
  }

  //시험일정 상세조회
  async findExam(examId: number, classId: number) {
    const existedExam = await this.examRepository.findOne({
      where: { examId, classId },
      relations: { examDetails: true },
      select: {
        examId: true,
        examTitle: true,
        examDate: true,
        studentAverage: true,
        createdAt: true,
        updatedAt: true,
        examDetails: {
          examDetailId: true,
          question: true,
          points: true,
        },
      },
    });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    return existedExam;
  }

  //시험일정 수정
  async updateExam(
    examId: number,
    dto: UpdateExamDto,
    adminId: number,
    classId: number,
  ) {
    const { examTitle, examDate, question, points } = dto;

    await this.dataSource.transaction(async (manager) => {
      const examRepo = manager.getRepository(Exam);
      const examDetailRepo = manager.getRepository(ExamDetail);
      const actionLogRepo = manager.getRepository(ActionLog);

      // 1) 시험 존재 확인
      const existedExam = await examRepo.findOne({
        where: { examId, classId },
      });
      if (!existedExam) {
        throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
      }

      // 2) Exam 기본정보 patch 구성
      const patch: Partial<Exam> = {};
      if (examTitle !== undefined) patch.examTitle = examTitle;

      if (examDate !== undefined) {
        patch.examDate = new Date(`${examDate}T00:00:00+09:00`);
      }

      // 3) ExamDetail 변경 여부 판단 + diff 계산
      const hasQuestions = Array.isArray(question);
      const hasPoints = Array.isArray(points);

      // 둘 중 하나만 왔으면 에러 (DTO에서 걸러도 서비스에서 한 번 더 보수적으로)
      if (hasQuestions !== hasPoints) {
        throw new BadRequestException(
          MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_QUESTION_POINTS_LENGTH_MISMATCH,
        );
      }

      let detailChanges: {
        added: Array<{ question: number; points: number }>;
        removed: number[];
        updated: Array<{ question: number; from: number; to: number }>;
      } | null = null;

      if (hasQuestions && hasPoints) {
        if (question.length !== points.length) {
          throw new BadRequestException(
            MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_QUESTION_POINTS_LENGTH_MISMATCH,
          );
        }

        // 기존 ExamDetail 전부 로드 (question 기준으로 diff)
        const existingDetails = await examDetailRepo.find({
          where: { examId },
          select: ['examDetailId', 'question', 'points'], // 필요한 것만
        });

        const existingMap = new Map<number, ExamDetail>();
        for (const d of existingDetails) existingMap.set(d.question, d);

        // 요청 값 -> Map(question -> points)
        const requestedMap = new Map<number, number>();
        for (let i = 0; i < question.length; i++) {
          requestedMap.set(question[i], points[i]);
        }

        const added: Array<{ question: number; points: number }> = [];
        const removed: number[] = [];
        const updated: Array<{ question: number; from: number; to: number }> =
          [];

        // (1) 추가/업데이트
        const toInsert: Array<Partial<ExamDetail>> = [];
        const toUpdate: ExamDetail[] = [];

        for (const [q, newPts] of requestedMap.entries()) {
          const existed = existingMap.get(q);

          if (!existed) {
            // 새 문항 추가
            added.push({ question: q, points: newPts });
            toInsert.push({
              examId,
              question: q,
              points: newPts,
              errorRate: null, // 집계는 별도 update 정책
            });
            continue;
          }

          // 기존 문항: points만 바뀐 경우에만 update
          const oldPts = existed.points;
          if (oldPts !== newPts) {
            updated.push({ question: q, from: oldPts, to: newPts });
            existed.points = newPts;
            toUpdate.push(existed);
          }
        }

        // (2) 삭제(요청에 없는 기존 문항)
        for (const [q, existed] of existingMap.entries()) {
          if (!requestedMap.has(q)) {
            removed.push(q);
          }
        }

        // 실제 DB 반영 (빈 배열 허용: question=[] points=[]이면 전체 삭제가 됨)
        if (toInsert.length > 0) {
          await examDetailRepo.insert(toInsert);
        }
        if (toUpdate.length > 0) {
          await examDetailRepo.save(toUpdate);
        }
        if (removed.length > 0) {
          await examDetailRepo.delete({ examId, question: removed as any });
          // ↑ TypeORM 조건상 배열 IN이 필요하면 아래처럼:
          // await examDetailRepo.delete({ examId, question: In(removed) });
        }

        detailChanges = { added, removed, updated };
      }

      // 4) 변경 사항이 하나도 없으면 에러
      const hasExamPatch = Object.keys(patch).length > 0;
      const hasDetailChange =
        detailChanges !== null &&
        (detailChanges.added.length > 0 ||
          detailChanges.removed.length > 0 ||
          detailChanges.updated.length > 0);

      if (!hasExamPatch && !hasDetailChange) {
        throw new BadRequestException(
          MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.NO_CHANGES,
        );
      }

      // 5) Exam 업데이트
      if (hasExamPatch) {
        await examRepo.update({ examId }, patch);
      }

      // 6) 로그 저장
      await actionLogRepo.save(
        actionLogRepo.create({
          actorId: adminId,
          actorType: 'admin',
          action: 'UPDATE_EXAM',
          targetType: 'exam',
          targetId: examId,
          description: `Admin updated an exam (examId: ${examId})`,
          changes: {
            ...(hasExamPatch ? { exam: patch } : {}),
            ...(hasDetailChange ? { examDetails: detailChanges } : {}),
          },
          createdAt: new Date(),
        }),
      );
    });

    return;
  }

  //시험일정 삭제
  async deleteExam(examId: number, adminId: number, classId: number) {
    const existedExam = await this.examRepository.findOneBy({
      examId,
      classId,
    });
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
  async createExamAverage(examId: number, adminId: number, classId: number) {
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

  // 시험 오답 문제 조회
  async getExamWrongAnswers(examId: number, classId: number) {
    // 1) exam이 해당 class 소속인지 검증
    const exam = await this.examRepository.findOne({
      where: { examId, classId },
      select: ['examId', 'examTitle', 'examDate', 'classId'],
    });
    if (!exam) throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);

    // 2) 문항/배점
    const questions = await this.examDetailRepository.find({
      where: { examId },
      select: ['examDetailId', 'question', 'points'],
      order: { question: 'ASC' },
    });

    // examDetailId -> question 매핑
    const questionByExamDetailId = new Map<number, number>();
    for (const q of questions)
      questionByExamDetailId.set(q.examDetailId, q.question);

    // 3) class 소속 학생 전체 (가능하면 학생 이름은 user 테이블 기준이 더 일반적)
    const students = await this.studentRepository
      .createQueryBuilder('s')
      .innerJoin(
        'student_class',
        'sc',
        'sc.student_id = s.student_id AND sc.deleted_at IS NULL',
      )
      .innerJoin('user', 'u', 'u.user_id = s.user_id AND u.deleted_at IS NULL') // 또는 u.status 조건
      .where('sc.class_id = :classId', { classId })
      .andWhere('s.deleted_at IS NULL')
      .select([
        's.student_id AS studentId',
        'u.name AS name',
        'u.email AS email', // 필요하면
        'u.phone AS phone', // 필요하면
        's.school AS school',
      ])
      .orderBy('u.name', 'ASC')
      .getRawMany<{
        studentId: number;
        name: string;
        email?: string;
        phone?: string;
        school: string;
      }>();

    const studentIds = students.map((s) => s.studentId);
    if (studentIds.length === 0) {
      return {
        exam: {
          examId: exam.examId,
          examTitle: exam.examTitle,
          examDate: exam.examDate,
        },
        questions: questions.map((q) => ({
          examDetailId: q.examDetailId,
          question: q.question,
          points: q.points,
        })),
        students: [],
      };
    }

    // 4) grades
    const grades = await this.gradeRepository.find({
      where: { examId, studentId: In(studentIds) },
      select: ['gradeId', 'studentId', 'isTaken', 'score'],
    });

    const gradeByStudentId = new Map<
      number,
      { gradeId: number; isTaken: boolean; score: number | null }
    >();
    const gradeIds: number[] = [];
    for (const g of grades) {
      gradeIds.push(g.gradeId);
      gradeByStudentId.set(g.studentId, {
        gradeId: g.gradeId,
        isTaken: g.isTaken,
        score: g.score,
      });
    }

    // 5) 오답: exam_detail 조인 없이 exam_detail_id만 가져오기
    const wrongRows = gradeIds.length
      ? await this.gradeWrongAnswerRepository
          .createQueryBuilder('wa')
          .where('wa.grade_id IN (:...gradeIds)', { gradeIds })
          .select([
            'wa.grade_id AS gradeId',
            'wa.exam_detail_id AS examDetailId',
          ])
          .getRawMany<{ gradeId: number; examDetailId: number }>()
      : [];

    const wrongByGradeId = new Map<number, number[]>(); // examDetailId[]
    for (const r of wrongRows) {
      if (!wrongByGradeId.has(r.gradeId)) wrongByGradeId.set(r.gradeId, []);
      wrongByGradeId.get(r.gradeId)!.push(r.examDetailId);
    }

    // 6) 조립
    const resultStudents = students.map((s) => {
      const g = gradeByStudentId.get(s.studentId);
      const wrongExamDetailIds = g ? (wrongByGradeId.get(g.gradeId) ?? []) : [];

      // (옵션) 화면이 question 번호 배열을 원하면 변환
      const wrongQuestions = wrongExamDetailIds
        .map((id) => questionByExamDetailId.get(id))
        .filter((v): v is number => typeof v === 'number')
        .sort((a, b) => a - b);

      return {
        studentId: s.studentId,
        name: s.name,
        school: s.school,
        isTaken: g?.isTaken ?? false,
        score: g?.score ?? null,

        // 저장/토글에 안전한 키
        wrongExamDetailIds,

        // 화면용(선택)
        wrongQuestions,
      };
    });

    return {
      exam: {
        examId: exam.examId,
        examTitle: exam.examTitle,
        examDate: exam.examDate,
      },
      questions: questions.map((q) => ({
        examDetailId: q.examDetailId,
        question: q.question,
        points: q.points,
      })),
      students: resultStudents,
    };
  }

  // 시험 오답 문제 수정
  async updateExamWrongAnswers(
    examId: number,
    classId: number,
    dto: ReplaceWrongAnswersDto,
    adminUserId: number,
  ) {
    const items = dto.items;

    // studentId 중복 제거(마지막 값 기준) - 방어 로직
    const itemByStudent = new Map<number, number[]>();
    for (const it of items)
      itemByStudent.set(it.studentId, it.wrongExamDetailIds);
    const studentIds = Array.from(itemByStudent.keys());

    // 요청에 들어온 모든 examDetailId 풀어서 검증용 set 구성
    const requestedDetailSet = new Set<number>();
    for (const ids of itemByStudent.values()) {
      for (const id of ids) requestedDetailSet.add(id);
    }
    const requestedDetailIds = Array.from(requestedDetailSet);

    return this.dataSource.transaction(async (manager) => {
      // 1) exam이 class 소속인지
      const exam = await manager.getRepository(Exam).findOne({
        where: { examId, classId },
        select: ['examId', 'classId'],
      });
      if (!exam)
        throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);

      // 2) 학생이 class 소속인지 검증 (IN)
      const rows = await manager
        .createQueryBuilder()
        .select('sc.student_id', 'studentId')
        .from('student_class', 'sc')
        .where('sc.class_id = :classId', { classId })
        .andWhere('sc.deleted_at IS NULL')
        .andWhere('sc.student_id IN (:...studentIds)', { studentIds })
        .getRawMany<{ studentId: number }>();

      const validStudentSet = new Set(rows.map((r) => Number(r.studentId)));
      const invalidStudents = studentIds.filter(
        (id) => !validStudentSet.has(id),
      );
      if (invalidStudents.length) {
        throw new BadRequestException(
          `${MESSAGES.ADMIN.CLASS.ERROR.STUDENT_NOT_IN_CLASS}: ${invalidStudents.join(', ')}`,
        );
      }

      // 3) examDetail이 exam 소속인지 검증 (IN)
      if (requestedDetailIds.length) {
        const validDetails = await manager.getRepository(ExamDetail).find({
          where: { examId, examDetailId: In(requestedDetailIds) },
          select: ['examDetailId'],
        });
        const validDetailSet = new Set(validDetails.map((d) => d.examDetailId));
        const invalidDetails = requestedDetailIds.filter(
          (id) => !validDetailSet.has(id),
        );
        if (invalidDetails.length) {
          throw new BadRequestException(
            `${MESSAGES.ADMIN.EXAM.ERROR.INVALID_EXAM_DETAIL}: ${invalidDetails.join(', ')}`,
          );
        }
      }

      // 4) grade 조회 + 없는 학생 grade 생성
      const gradeRepo = manager.getRepository(Grade);
      const existingGrades = await gradeRepo.find({
        where: { examId, studentId: In(studentIds) },
        select: ['gradeId', 'studentId', 'isTaken'],
      });

      const gradeIdByStudentId = new Map<number, number>();
      const existingStudentSet = new Set<number>();
      const notTakenGradeIds: number[] = [];

      for (const g of existingGrades) {
        gradeIdByStudentId.set(g.studentId, g.gradeId);
        existingStudentSet.add(g.studentId);
        if (!g.isTaken) notTakenGradeIds.push(g.gradeId);
      }

      const missingStudentIds = studentIds.filter(
        (id) => !existingStudentSet.has(id),
      );
      if (missingStudentIds.length) {
        await gradeRepo
          .createQueryBuilder()
          .insert()
          .into(Grade)
          .values(
            missingStudentIds.map((sid) => ({
              examId,
              studentId: sid,
              isTaken: true,
              score: null,
            })),
          )
          .execute();

        const createdGrades = await gradeRepo.find({
          where: { examId, studentId: In(missingStudentIds) },
          select: ['gradeId', 'studentId'],
        });
        for (const g of createdGrades) {
          gradeIdByStudentId.set(g.studentId, g.gradeId);
        }
      }

      // (선택) 기존 grade 중 isTaken=false면 true로
      if (notTakenGradeIds.length) {
        await gradeRepo.update(
          { gradeId: In(notTakenGradeIds) },
          { isTaken: true },
        );
      }

      // 5) 기존 오답 로드 (요청에 포함된 학생들만)
      const gradeIds = studentIds
        .map((sid) => gradeIdByStudentId.get(sid))
        .filter((v): v is number => typeof v === 'number');

      const waRepo = manager.getRepository(GradeWrongAnswer);

      const existingWrongRows = gradeIds.length
        ? await waRepo.find({
            where: { gradeId: In(gradeIds) },
            select: ['gradeId', 'examDetailId'],
          })
        : [];

      const existingSetByGrade = new Map<number, Set<number>>();
      for (const row of existingWrongRows) {
        if (!existingSetByGrade.has(row.gradeId))
          existingSetByGrade.set(row.gradeId, new Set());
        existingSetByGrade.get(row.gradeId)!.add(row.examDetailId);
      }

      // 6) 학생별 diff -> delete / insert 준비
      const inserts: Array<{ gradeId: number; examDetailId: number }> = [];
      const deletesByGrade = new Map<number, number[]>();

      for (const [studentId, wantedIds] of itemByStudent) {
        const gradeId = gradeIdByStudentId.get(studentId);
        if (!gradeId) continue;

        const wantSet = new Set(wantedIds);
        const curSet = existingSetByGrade.get(gradeId) ?? new Set<number>();

        // delete: cur - want
        const toDelete: number[] = [];
        for (const cur of curSet) {
          if (!wantSet.has(cur)) toDelete.push(cur);
        }
        if (toDelete.length) deletesByGrade.set(gradeId, toDelete);

        // insert: want - cur
        for (const want of wantSet) {
          if (!curSet.has(want)) inserts.push({ gradeId, examDetailId: want });
        }
      }

      // 7) delete 실행 (gradeId별로 IN)
      for (const [gradeId, detailIds] of deletesByGrade) {
        await waRepo.delete({ gradeId, examDetailId: In(detailIds) });
      }

      // 8) insert ignore (중복 방지)
      if (inserts.length) {
        await waRepo
          .createQueryBuilder()
          .insert()
          .into(GradeWrongAnswer)
          .values(inserts)
          .orIgnore()
          .execute();
      }
      // 9) 로그 저장
      await manager.getRepository(ActionLog).save({
        actorId: adminUserId,
        actorType: 'admin',
        action: 'UPDATE_EXAM_WRONG_ANSWERS',
        targetType: 'exam',
        targetId: examId,
        description: `Admin updated exam wrong answers (examId: ${examId})`,
        createdAt: new Date(),
      });

      return { appliedStudents: studentIds.length };
    });
  }

  // 시험 오답률 계산
  async calculateExamErrorRates(examId: number, classId: number) {
    // 0) exam이 class 소속인지 검증
    const exam = await this.examRepository.findOne({
      where: { examId, classId },
      select: ['examId', 'classId'], // 필요하면 examTitle/examDate도 추가 가능
    });
    if (!exam) throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);

    // 1) class 소속 "활성 학생" 목록 가져오기
    // ⚠️ student_class 테이블명/컬럼명은 프로젝트에 맞게 수정하세요.
    const studentRows = await this.studentRepository
      .createQueryBuilder('s')
      .innerJoin(
        'student_class',
        'sc',
        'sc.student_id = s.student_id AND sc.deleted_at IS NULL',
      )
      .where('sc.class_id = :classId', { classId })
      .andWhere('s.deleted_at IS NULL')
      .select(['s.student_id AS studentId'])
      .getRawMany<{ studentId: number }>();

    const studentIds = studentRows.map((r) => r.studentId);

    // 학생이 없으면 업데이트 X
    if (studentIds.length === 0) {
      return {
        examId,
        takenCount: 0,
        updatedQuestions: 0,
      };
    }

    // 2) 트랜잭션으로 “집계값 계산 + 저장”을 한번에
    return this.dataSource.transaction(async (manager) => {
      const gradeRepo = manager.getRepository(Grade);
      const wrongRepo = manager.getRepository(GradeWrongAnswer);
      const examDetailRepo = manager.getRepository(ExamDetail);
      const examRepo = manager.getRepository(Exam);

      // 2-1) 응시자(분모) = grade.is_taken=true 인 학생들
      const takenGrades = await gradeRepo.find({
        where: { examId, studentId: In(studentIds), isTaken: true },
        select: ['gradeId', 'score'],
      });

      const takenCount = takenGrades.length;

      // 2-2) 시험 문항 목록
      const examDetails = await examDetailRepo.find({
        where: { examId },
        select: ['examDetailId'],
      });

      // 응시자 0명일 때: error_rate = null
      if (takenCount === 0) {
        if (examDetails.length > 0) {
          await examDetailRepo.save(
            examDetails.map((d) =>
              examDetailRepo.create({
                examDetailId: d.examDetailId,
                errorRate: null,
              }),
            ),
          );
        }
        return {
          examId,
          takenCount: 0,
          updatedQuestions: examDetails.length,
        };
      }

      const gradeIds = takenGrades.map((g) => g.gradeId);

      // 2-3) 문항별 오답 수 집계 (오답만 저장이므로 row count = 오답자 수)
      const wrongAgg = await wrongRepo
        .createQueryBuilder('wa')
        .select('wa.exam_detail_id', 'examDetailId')
        .addSelect('COUNT(*)', 'wrongCount')
        .where('wa.grade_id IN (:...gradeIds)', { gradeIds })
        .groupBy('wa.exam_detail_id')
        .getRawMany<{ examDetailId: string; wrongCount: string }>();

      const wrongCountByDetailId = new Map<number, number>();
      for (const row of wrongAgg) {
        wrongCountByDetailId.set(
          Number(row.examDetailId),
          Number(row.wrongCount),
        );
      }

      // 2-4) ExamDetail.error_rate 업데이트 (decimal(5,2) 가정)
      if (examDetails.length > 0) {
        const updates = examDetails.map((d) => {
          const wrongCount = wrongCountByDetailId.get(d.examDetailId) ?? 0;
          const rate = (wrongCount / takenCount) * 100;
          // ✅ decimal(5,2)용 문자열로 저장 ("12.30" 처럼 2자리 고정)
          const errorRate = Number.isFinite(rate) ? rate.toFixed(2) : null;

          return examDetailRepo.create({
            examDetailId: d.examDetailId,
            errorRate,
          });
        });

        await examDetailRepo.save(updates);
      }

      return {
        examId,
        takenCount,
        updatedQuestions: examDetails.length,
      };
    });
  }

  // 시험 오답률 조회
  async getExamErrorRates(examId: number, classId: number) {
    // 0) exam이 class 소속인지 검증
    const exam = await this.examRepository.findOne({
      where: { examId, classId },
      select: ['examId', 'classId'],
    });
    if (!exam) throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);

    // 1) 문항별 오답률 조회
    const details = await this.examDetailRepository.find({
      where: { examId },
      select: ['question', 'points', 'errorRate'],
      order: { question: 'ASC' },
    });

    return {
      exam: {
        examId: exam.examId,
      },
      details,
    };
  }

  // 시험 등수 계산
  async calculateExamRankings(examId: number, classId: number) {
    // 0) exam이 class 소속인지 검증
    const exam = await this.examRepository.findOne({
      where: { examId, classId },
      select: ['examId', 'classId'],
    });
    if (!exam) throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);

    // 1) class 소속 "활성 학생" 목록 가져오기
    const studentRows = await this.studentRepository
      .createQueryBuilder('s')
      .innerJoin(
        'student_class',
        'sc',
        'sc.student_id = s.student_id AND sc.deleted_at IS NULL',
      )
      .where('sc.class_id = :classId', { classId })
      .andWhere('s.deleted_at IS NULL')
      .select(['s.student_id AS studentId'])
      .getRawMany<{ studentId: number }>();

    const studentIds = studentRows.map((r) => r.studentId);

    // 학생이 없으면 업데이트 X
    if (studentIds.length === 0) {
      return { examId, updated: 0, rankedCount: 0 };
    }

    // 2) 트랜잭션
    return this.dataSource.transaction(async (manager) => {
      const gradeRepo = manager.getRepository(Grade);

      // 2-1) 우선 해당 반 학생들의 rank를 null로 초기화
      // - 응시 안 했거나 score 없는 학생은 rank가 남아있으면 혼란이 생길 수 있음
      await gradeRepo
        .createQueryBuilder()
        .update(Grade)
        .set({ ranking: null })
        .where('exam_id = :examId', { examId })
        .andWhere('student_id IN (:...studentIds)', { studentIds })
        .execute();

      // 2-2) 순위 산정 대상: is_taken=true AND score IS NOT NULL
      const grades = await gradeRepo.find({
        where: {
          examId,
          studentId: In(studentIds),
          isTaken: true,
        },
        select: ['gradeId', 'score'],
      });

      const scored = grades
        .filter((g) => g.score !== null)
        // 점수 내림차순, 동점이면 gradeId로 안정적인 정렬(선택)
        .sort((a, b) => b.score! - a.score! || a.gradeId - b.gradeId);

      if (scored.length === 0) {
        return { examId, updated: 0, rankedCount: 0 };
      }

      // 2-3) 경쟁 순위 부여: 100,95,95,90 => 1,2,2,4
      let prevScore: number | null = null;
      let rank = 0;
      let index = 0;

      const updates: Array<Pick<Grade, 'gradeId' | 'ranking'>> = [];

      for (const g of scored) {
        index += 1;
        if (prevScore === null || g.score! !== prevScore) {
          rank = index;
          prevScore = g.score!;
        }
        updates.push({ gradeId: g.gradeId, ranking: rank });
      }

      // 2-4) 저장
      await gradeRepo.save(updates);

      return { examId, updated: updates.length, rankedCount: scored.length };
    });
  }

  // 시험 등수 조회
  async getExamRankings(examId: number, classId: number) {
    // 0) exam이 class 소속인지 검증
    const exam = await this.examRepository.findOne({
      where: { examId, classId },
      select: ['examId', 'classId'],
    });
    if (!exam) throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);

    // 1) 반 학생 전체 + 해당 시험의 grade(LEFT JOIN)
    const rows = await this.studentRepository
      .createQueryBuilder('s')
      .innerJoin(
        'student_class',
        'sc',
        'sc.student_id = s.student_id AND sc.deleted_at IS NULL',
      )
      .innerJoin('user', 'u', 'u.user_id = s.user_id AND u.deleted_at IS NULL') // ✅ 추가
      .leftJoin(
        'grade',
        'g',
        'g.student_id = s.student_id AND g.exam_id = :examId ',
        { examId },
      )
      .where('sc.class_id = :classId', { classId })
      .andWhere('s.deleted_at IS NULL')
      .select([
        's.student_id AS studentId',
        'u.name AS name',
        'g.is_taken AS isTaken',
        'g.score AS score',
        'g.ranking AS ranking',
      ])
      .orderBy('g.ranking IS NULL', 'ASC')
      .addOrderBy('g.ranking', 'ASC')
      .addOrderBy('u.name', 'ASC')
      .getRawMany();
    console.log(rows);
    return {
      exam: { examId },
      students: rows.map((r) => ({
        studentId: r.studentId,
        name: r.name,
        isTaken: r.isTaken === null ? false : Boolean(r.isTaken),
        score: r.score ?? null,
        ranking: r.ranking ?? null,
      })),
    };
  }
}
