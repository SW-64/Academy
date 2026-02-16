import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';

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
import { Class } from './../class/entities/class.entity';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class ExamService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
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
      const classRepo = manager.getRepository(Class);

      // 0) Class 검증
      const existedClass = await classRepo.existsBy({
        classId,
        deletedAt: IsNull(),
      });
      if (!existedClass) {
        throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
      }
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

      // 2-1) 둘 중 하나만 온 경우는 명확히 차단
      if (hasQuestions !== hasPoints) {
        throw new BadRequestException(
          MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.EXAM_QUESTION_POINTS_LENGTH_MISMATCH,
        );
      }

      // 2-2) 둘 다 온 경우에만 길이 검증 및 insert
      if (hasQuestions && hasPoints) {
        if (question.length !== points.length) {
          throw new BadRequestException(
            MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.EXAM_QUESTION_POINTS_LENGTH_MISMATCH,
          );
        }

        // 빈 배열 허용 정책이면 그대로 스킵
        if (question.length > 0) {
          const details = question.map((q, idx) => ({
            examId: exam.examId,
            question: q,
            points: points![idx],
            errorRate: null,
          }));

          await examDetailRepo
            .createQueryBuilder()
            .insert()
            .into(ExamDetail)
            .values(details)
            .orIgnore() // ← 추가 (중복 방지)
            .execute();
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

      return { examId: exam.examId };
    });
  }

  //시험일정 전체조회
  async findAllExams(
    classId: number,
    options?: IPaginationOptions,
  ): Promise<Pagination<Exam>> {
    const exams = await paginate(this.examRepository, options, {
      order: { examDate: 'DESC' },
      where: { classId, deletedAt: IsNull() },
      select: {
        examId: true,
        examTitle: true,
        examDate: true,
        studentAverage: true,
        topStudentAverage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return exams;
  }

  //시험일정 상세조회
  async findExam(examId: number, classId: number) {
    const exam = await this.examRepository
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.examDetails', 'd')
      .where('e.exam_id = :examId', { examId })
      .andWhere('e.class_id = :classId', { classId })
      .andWhere('e.deleted_at IS NULL')
      .orderBy('d.question', 'ASC')
      .select([
        'e.examId',
        'e.examTitle',
        'e.examDate',
        'e.studentAverage',
        'e.topStudentAverage',
        'e.createdAt',
        'e.updatedAt',
        'd.examDetailId',
        'd.question',
        'd.points',
      ])
      .getOne();

    if (!exam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }

    return exam;
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
      const existedExam = await examRepo.existsBy({
        examId,
        classId,
        deletedAt: IsNull(),
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
          await examDetailRepo
            .createQueryBuilder()
            .insert()
            .into(ExamDetail)
            .values(toInsert)
            .orIgnore() // 동시성 안전
            .execute();
        }
        if (toUpdate.length > 0) {
          await examDetailRepo.save(toUpdate);
        }
        if (removed.length > 0) {
          await examDetailRepo.delete({ examId, question: In(removed) });
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
        await examRepo.update({ examId, classId, deletedAt: IsNull() }, patch);
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
    const existedExam = await this.examRepository.existsBy({
      examId,
      classId,
      deletedAt: IsNull(),
    });
    if (!existedExam) {
      throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
    }
    await this.examRepository.softDelete({
      examId,
      classId,
    });

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
    return this.dataSource.transaction(async (manager) => {
      const examRepo = manager.getRepository(Exam);
      const actionLogRepo = manager.getRepository(ActionLog);
      const gradeRepo = manager.getRepository(Grade);

      const existedExam = await examRepo.findOne({
        where: {
          examId,
          classId,
          deletedAt: IsNull(),
        },
        select: {
          examId: true,
          studentAverage: true,
        },
      });
      if (!existedExam) {
        throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
      }

      // DB에서 평균/개수만 계산해서 가져오기
      const row = await gradeRepo
        .createQueryBuilder('g')
        .select('COUNT(g.grade_id)', 'cnt')
        .addSelect('AVG(g.score)', 'avg')
        .where('g.exam_id = :examId', { examId })
        .andWhere('g.deleted_at IS NULL')
        .getRawOne<{ cnt: string; avg: string | null }>();

      if (row.avg == null) {
        throw new BadRequestException(MESSAGES.ADMIN.GRADE.ERROR.NO_GRADES);
      }

      const cnt = Number(row?.cnt ?? 0);
      if (cnt === 0) {
        throw new BadRequestException(MESSAGES.ADMIN.GRADE.ERROR.NO_GRADES);
      }

      // AVG는 DB/드라이버에 따라 문자열로 올 수 있어서 숫자 변환/반올림 처리
      const avgNumber = Number(row.avg);
      const average = avgNumber.toFixed(2); // "86.50"

      existedExam.studentAverage = average;
      await examRepo.update(
        { examId, classId, deletedAt: IsNull() },
        { studentAverage: average },
      );

      // 로그 저장
      await actionLogRepo.save({
        actorId: adminId,
        actorType: 'admin',
        action: 'CREATE_EXAM_AVERAGE',
        targetType: 'exam',
        targetId: examId,
        description: `Admin created exam average (examId: ${examId}, average: ${average})`,
        createdAt: new Date(),
      });
      return existedExam;
    });
  }

  // 시험 오답 문제 조회
  async getExamWrongAnswers(examId: number, classId: number) {
    // 1) exam이 해당 class 소속인지 검증
    const exam = await this.examRepository.findOne({
      where: { examId, classId, deletedAt: IsNull() },
      select: [
        'examId',
        'examTitle',
        'examDate',
        'classId',
        'studentAverage',
        'topStudentAverage',
      ],
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
        's.school AS school',
      ])
      .orderBy('u.name', 'ASC')
      .getRawMany<{
        studentId: number;
        name: string;
        loginId?: string;
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
      where: { examId, studentId: In(studentIds), deletedAt: IsNull() },
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
      const isTaken = g?.isTaken ?? false;
      const score = g?.score ?? null;

      // 미응시면 오답은 무조건 빈 배열로 처리 (데이터 이상/오작동 방어)
      const wrongExamDetailIds =
        isTaken && g ? (wrongByGradeId.get(g.gradeId) ?? []) : [];

      // 화면이 question 번호 배열을 원하면 변환
      const wrongQuestions = wrongExamDetailIds
        .map((id) => questionByExamDetailId.get(id))
        .filter((v): v is number => typeof v === 'number')
        .sort((a, b) => a - b);

      return {
        studentId: s.studentId,
        name: s.name,
        school: s.school,
        isTaken,
        score,

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
        studentAverage: exam.studentAverage,
        topStudentAverage: exam.topStudentAverage,
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
    const itemByStudent = new Map<
      number,
      { isTaken: boolean; wrongExamDetailIds: number[] }
    >();

    for (const it of items) {
      itemByStudent.set(it.studentId, {
        isTaken: it.isTaken,
        wrongExamDetailIds: it.wrongExamDetailIds ?? [],
      });
    }
    const studentIds = Array.from(itemByStudent.keys());
    if (studentIds.length == 0) {
      throw new BadRequestException(MESSAGES.ADMIN.EXAM.ERROR.NO_STUDENTS);
    }

    // 요청에 들어온 모든 examDetailId 풀어서 검증용 set 구성
    const requestedDetailSet = new Set<number>();
    for (const v of itemByStudent.values()) {
      if (!v.isTaken) continue;
      for (const id of v.wrongExamDetailIds) requestedDetailSet.add(id);
    }
    const requestedDetailIds = Array.from(requestedDetailSet);

    await this.dataSource.transaction(async (manager) => {
      // 1) exam이 class 소속인지
      const exam = await manager.getRepository(Exam).findOne({
        where: { examId, classId, deletedAt: IsNull() },
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
        where: { examId, studentId: In(studentIds), deletedAt: IsNull() },
        select: ['gradeId', 'studentId', 'isTaken'],
      });

      const gradeIdByStudentId = new Map<number, number>();
      const existingStudentSet = new Set<number>();

      for (const g of existingGrades) {
        gradeIdByStudentId.set(g.studentId, g.gradeId);
        existingStudentSet.add(g.studentId);
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
            missingStudentIds.map((sid) => {
              const it = itemByStudent.get(sid)!;
              return {
                examId,
                studentId: sid,
                isTaken: it.isTaken,
                score: null, // false면 null 유지
              };
            }),
          )
          .orIgnore()
          .execute();

        const createdGrades = await gradeRepo.find({
          where: {
            examId,
            studentId: In(missingStudentIds),
            deletedAt: IsNull(),
          },
          select: ['gradeId', 'studentId'],
        });
        for (const g of createdGrades) {
          gradeIdByStudentId.set(g.studentId, g.gradeId);
        }
      }

      const toTakenTrue: number[] = [];
      const toTakenFalse: number[] = [];

      for (const [studentId, v] of itemByStudent) {
        if (!v.isTaken && v.wrongExamDetailIds.length > 0) {
          throw new BadRequestException(
            `${MESSAGES.ADMIN.EXAM.ERROR.INVALID_WRONG_ANSWERS_FOR_NOT_TAKEN}`,
          );
        }
        const gradeId = gradeIdByStudentId.get(studentId);
        if (!gradeId) continue;
        if (v.isTaken) toTakenTrue.push(gradeId);
        else toTakenFalse.push(gradeId);
      }

      if (toTakenTrue.length) {
        await gradeRepo.update(
          { gradeId: In(toTakenTrue), deletedAt: IsNull() },
          { isTaken: true },
        );
      }
      if (toTakenFalse.length) {
        await gradeRepo.update(
          { gradeId: In(toTakenFalse), deletedAt: IsNull() },
          { isTaken: false, score: null, ranking: null }, // 정책 추천
        );
      }

      // 5) 기존 오답 로드 (요청에 포함된 학생들만)
      const takenGradeIds = studentIds
        .filter((sid) => itemByStudent.get(sid)?.isTaken === true)
        .map((sid) => gradeIdByStudentId.get(sid))
        .filter((v): v is number => typeof v === 'number');

      const waRepo = manager.getRepository(GradeWrongAnswer);

      const existingWrongRows = takenGradeIds.length
        ? await waRepo.find({
            where: { gradeId: In(takenGradeIds) },
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
      const notTakenGradeIdSet = new Set<number>();
      for (const [studentId, v] of itemByStudent) {
        const gradeId = gradeIdByStudentId.get(studentId);
        if (!gradeId) continue;

        // 미응시: 오답은 “전부 삭제”가 맞음
        if (!v.isTaken) {
          notTakenGradeIdSet.add(gradeId);
          continue;
        }

        const wantedIds = v.wrongExamDetailIds;
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
      const notTakenGradeIds = Array.from(notTakenGradeIdSet);
      if (notTakenGradeIds.length) {
        await waRepo.delete({ gradeId: In(notTakenGradeIds) });
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
      // ✅ 8-1) 점수 재계산: totalPoints - wrongPoints
      // (A) 시험 총점 계산
      const examDetailRepo = manager.getRepository(ExamDetail);

      const totalRow = await examDetailRepo
        .createQueryBuilder('ed')
        .select('COALESCE(SUM(ed.points), 0)', 'total')
        .where('ed.exam_id = :examId', { examId })
        .getRawOne<{ total: string }>();

      const totalPoints = Number(totalRow?.total ?? 0);

      // (B) gradeId별 오답 점수 합계 계산 (오답 테이블 + exam_detail join)
      const wrongSums = takenGradeIds.length
        ? await manager
            .createQueryBuilder()
            .select('gwa.grade_id', 'gradeId')
            .addSelect('COALESCE(SUM(ed.points), 0)', 'wrongPoints')
            .from(GradeWrongAnswer, 'gwa')
            .innerJoin(
              ExamDetail,
              'ed',
              'ed.exam_detail_id = gwa.exam_detail_id AND ed.exam_id = :examId',
              { examId },
            )
            .where('gwa.grade_id IN (:...takenGradeIds)', { takenGradeIds })
            .groupBy('gwa.grade_id')
            .getRawMany<{ gradeId: string; wrongPoints: string }>()
        : [];

      const wrongMap = new Map<number, number>(
        wrongSums.map((r) => [Number(r.gradeId), Number(r.wrongPoints)]),
      );

      // (C) Grade 벌크 업데이트 (CASE WHEN)
      // - 오답이 없는 gradeId는 wrongPoints=0 -> score=totalPoints
      // - score가 null이어야 한다면 totalPoints가 0일 때 null 처리 등 정책 결정 가능
      if (takenGradeIds.length) {
        const cases = takenGradeIds
          .map((gid) => {
            const wrong = wrongMap.get(gid) ?? 0;
            const score = Math.max(0, totalPoints - wrong);
            return `WHEN ${gid} THEN ${score}`;
          })
          .join(' ');

        await gradeRepo
          .createQueryBuilder()
          .update(Grade)
          .set({
            score: () => `CASE grade_id ${cases} END`,
          })
          .where('grade_id IN (:...takenGradeIds)', { takenGradeIds })
          .andWhere('deleted_at IS NULL')
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
    });
    await this.createExamAverage(examId, adminUserId, classId);
    await this.createHighExamAverage(examId, adminUserId, classId);
  }

  // 시험 오답률 계산
  async calculateExamErrorRates(examId: number, classId: number) {
    // 0) exam이 class 소속인지 검증
    const exam = await this.examRepository.findOne({
      where: { examId, classId, deletedAt: IsNull() },
      select: ['examId', 'classId'], // 필요하면 examTitle/examDate도 추가 가능
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
        where: {
          examId,
          studentId: In(studentIds),
          isTaken: true,
          deletedAt: IsNull(),
        },
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
        .innerJoin(
          ExamDetail,
          'ed',
          'ed.exam_detail_id = wa.exam_detail_id AND ed.exam_id = :examId',
          { examId },
        )
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
      where: { examId, classId, deletedAt: IsNull() },
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
      where: { examId, classId, deletedAt: IsNull() },
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
        .andWhere('deleted_at IS NULL')
        .execute();

      // 2-2) 순위 산정 대상: is_taken=true AND score IS NOT NULL
      const grades = await gradeRepo.find({
        where: {
          examId,
          studentId: In(studentIds),
          isTaken: true,
          deletedAt: IsNull(),
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
      where: { examId, classId, deletedAt: IsNull() },
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
      .innerJoin('user', 'u', 'u.user_id = s.user_id AND u.deleted_at IS NULL')
      .leftJoin(
        'grade',
        'g',
        'g.student_id = s.student_id AND g.exam_id = :examId AND g.deleted_at IS NULL',
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
    return rows;
  }

  // 상위 30% 시험 평균 생성
  async createHighExamAverage(
    examId: number,
    adminId: number,
    classId: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const examRepo = manager.getRepository(Exam);
      const actionLogRepo = manager.getRepository(ActionLog);
      const gradeRepo = manager.getRepository(Grade);

      const existedExam = await examRepo.findOne({
        where: {
          examId,
          classId,
          deletedAt: IsNull(),
        },
        select: {
          examId: true,
          topStudentAverage: true,
        },
      });

      if (!existedExam) {
        throw new NotFoundException(MESSAGES.ADMIN.EXAM.ERROR.NOT_FOUND);
      }

      // 전체 학생 수 조회
      const totalCount = await gradeRepo
        .createQueryBuilder('g')
        .where('g.exam_id = :examId', { examId })
        .andWhere('g.deleted_at IS NULL')
        .getCount();

      if (totalCount === 0) {
        throw new BadRequestException(MESSAGES.ADMIN.GRADE.ERROR.NO_GRADES);
      }

      // 상위 30% 학생 수 계산
      const topPercentage = 0.3;
      const topCount = Math.ceil(totalCount * topPercentage);

      // 순위 기반으로 상위 학생 평균 계산 (동점자 모두 포함)
      const row = await manager.query(
        `
      SELECT AVG(score) as avg
      FROM (
        SELECT score
        FROM grade
        WHERE exam_id = ? 
          AND deleted_at IS NULL
        ORDER BY score DESC
        LIMIT ?
      ) AS top_students
      `,
        [examId, topCount],
      );

      if (!row[0]?.avg) {
        throw new BadRequestException(MESSAGES.ADMIN.GRADE.ERROR.NO_GRADES);
      }
      const avgNumber = Number(row[0].avg);
      const average = avgNumber.toFixed(2);
      existedExam.topStudentAverage = average;
      await examRepo.update(
        { examId, classId, deletedAt: IsNull() },
        { topStudentAverage: average },
      );

      await actionLogRepo.save({
        actorId: adminId,
        actorType: 'admin',
        action: 'CREATE_TOP_EXAM_AVERAGE',
        targetType: 'exam',
        targetId: examId,
        description: `Admin created exam average for top ${topPercentage * 100}% (examId: ${examId}, count: ${topCount}/${totalCount}, average: ${average})`,
        createdAt: new Date(),
      });

      return existedExam;
    });
  }
}
