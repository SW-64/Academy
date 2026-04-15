/**
 * 부하테스트용 더미 데이터 시딩 스크립트
 * 실행: npm run seed
 *
 * 삽입 순서
 *   User → Admin/Parent/Student → Class → StudentClass
 *   → Notice/ClassNotice → Textbook/TextbookChapter/ClassTextbook
 *   → Progress/ProgressChapter → Material/ClassMaterial
 *   → Exam/ExamDetail → Grade → GradeWrongAnswer
 *   → ExamDetail(errorRate 갱신) → Grade(ranking 갱신)
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../configs/data-source';

import { User, Role, Status } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { Parent } from '../parents/entities/parent.entity';
import { Admin } from '../admin/entities/admin.entity';
import { RefreshToken } from '../auth/entities/refreshtoken.entity';
import { Class } from '../class/entities/class.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { Notice } from '../notices/entities/notice.entity';
import { ClassNotice } from '../notices/entities/class-notice.entity';
import { Textbook } from '../textbook/entities/textbook.entity';
import { TextbookChapter } from '../textbook/entities/textbook-chapter.entity';
import { ClassTextbook } from '../class-textbook/entities/class-textbook.entity';
import { Progress } from '../homework/entities/progress.entity';
import {
  ProgressChapter,
  ProgressStatus,
} from '../homework/entities/progress-chapter.entity';
import { Material } from '../materials/entities/material.entity';
import { ClassMaterial } from '../materials/entities/class-material.entity';
import { Exam } from '../exam/entities/exam.entity';
import { ExamDetail } from '../exam/entities/exam-detail.entity';
import { Grade } from '../grades/entities/grade.entity';
import { GradeWrongAnswer } from '../grades/entities/grade-wrong-answer.entity';

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

/**
 * 0..total-1 에서 count개를 중복 없이 랜덤 선택 (Fisher-Yates)
 */
function pickRandom(total: number, count: number): number[] {
  if (count <= 0) return [];
  const arr = Array.from({ length: total }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = rand(i, total - 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

/** TypeORM bulk insert 후 첫 번째 insertId 반환 (MySQL auto_increment 기준) */
async function insertBatch<T extends object>(
  entity: new () => T,
  rows: Partial<T>[],
  batchSize = 500,
): Promise<number> {
  if (rows.length === 0) return 0;
  let firstId = 0;
  for (const [i, batch] of chunk(rows, batchSize).entries()) {
    const result = await AppDataSource.createQueryBuilder()
      .insert()
      .into(entity)
      .values(batch as any)
      .execute();
    if (i === 0) firstId = result.raw.insertId as number;
  }
  return firstId;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('━'.repeat(60));
  console.log('  Academy 더미 데이터 시딩 시작');
  console.log('━'.repeat(60));

  await AppDataSource.initialize();

  // ── 0. 전체 테이블 초기화 (FK 체크 비활성화) ──────────────────────────────────
  console.log('\n[0/11] 기존 데이터 초기화...');

  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  try {
    await qr.query('SET FOREIGN_KEY_CHECKS = 0');

    const entitiesToClear = [
      GradeWrongAnswer,
      Grade,
      ExamDetail,
      Exam,
      ProgressChapter,
      Progress,
      ClassTextbook,
      TextbookChapter,
      Textbook,
      ClassMaterial,
      Material,
      ClassNotice,
      Notice,
      StudentClass,
      Class,
      Student,
      Parent,
      Admin,
      RefreshToken,
      User,
    ] as const;

    for (const entity of entitiesToClear) {
      await qr.manager.createQueryBuilder().delete().from(entity).execute();
    }

    await qr.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await qr.release();
  }
  console.log('  완료');

  // ── 1. 비밀번호 해시 ─────────────────────────────────────────────────────────
  const rounds = parseInt(process.env.PASSWORD_HASH ?? '10', 10);
  console.log(`\n[1/11] 비밀번호 해시 (rounds=${rounds})...`);
  const hashedPw = await bcrypt.hash('Example1!', rounds);
  console.log('  완료');

  // ── 2. 유저 생성 (Admin 1 + Parent 100 + Student 200) ──────────────────────
  console.log('\n[2/11] 유저 생성 (301명)...');

  const adminUserId = await insertBatch(User, [
    {
      loginId: 'admin',
      name: '관리자',
      role: Role.ADMIN,
      phone: '010-0000-0001',
      password: hashedPw,
      status: Status.approved,
    },
  ]);

  const parentUserRows = Array.from({ length: 100 }, (_, i) => ({
    loginId: `parent${i + 1}`,
    name: `학부모${i + 1}`,
    role: Role.PARENT,
    phone: `010-2${String(i + 1).padStart(3, '0')}-0001`,
    password: hashedPw,
    status: Status.approved,
  }));
  const firstParentUserId = await insertBatch(User, parentUserRows);

  const studentUserRows = Array.from({ length: 200 }, (_, i) => ({
    loginId: `student${i + 1}`,
    name: `학생${i + 1}`,
    role: Role.STUDENT,
    phone: `010-1${String(i + 1).padStart(3, '0')}-0001`,
    password: hashedPw,
    status: Status.approved,
  }));
  const firstStudentUserId = await insertBatch(User, studentUserRows);
  console.log('  완료');

  // ── 3. 역할별 프로필 생성 ────────────────────────────────────────────────────
  console.log('\n[3/11] 역할 프로필 생성...');

  const adminId = await insertBatch(Admin, [{ userId: adminUserId }]);

  const firstParentId = await insertBatch(
    Parent,
    Array.from({ length: 100 }, (_, i) => ({ userId: firstParentUserId + i })),
  );

  const schools = ['서울중학교', '경기중학교', '인천중학교', '부산중학교', '대구중학교'];
  const firstStudentId = await insertBatch(
    Student,
    Array.from({ length: 200 }, (_, i) => ({
      userId: firstStudentUserId + i,
      parentId: i < 100 ? firstParentId + i : null, // student1~100 ↔ parent1~100
      grade: (i % 3) + 1,
      school: schools[i % 5],
    })),
  );

  const studentIds = Array.from({ length: 200 }, (_, i) => firstStudentId + i);
  console.log('  완료');

  // ── 4. 클래스 5개 ────────────────────────────────────────────────────────────
  console.log('\n[4/11] 클래스 생성 (5개)...');
  const classNames = ['월요반', '화요반', '수요반', '목요반', '금요반'];
  const firstClassId = await insertBatch(
    Class,
    classNames.map((n) => ({ className: n })),
  );
  const classIds = Array.from({ length: 5 }, (_, i) => firstClassId + i);
  console.log('  완료');

  // ── 5. StudentClass: 학생당 2개 클래스, 클래스당 80명 ─────────────────────────
  //  블록 분할 (40명씩):
  //    block 0 (학생   1~ 40) → 클래스 0, 1
  //    block 1 (학생  41~ 80) → 클래스 1, 2
  //    block 2 (학생  81~120) → 클래스 2, 3
  //    block 3 (학생 121~160) → 클래스 3, 4
  //    block 4 (학생 161~200) → 클래스 4, 0
  console.log('\n[5/11] StudentClass 생성 (400건)...');

  const studentClassRows: Array<{ studentId: number; classId: number }> = [];
  /** classId → 소속 studentId 목록 (40명) */
  const classStudentMap: Record<number, number[]> = {};
  for (const cid of classIds) classStudentMap[cid] = [];

  for (let block = 0; block < 5; block++) {
    const cidA = classIds[block];
    const cidB = classIds[(block + 1) % 5];
    for (let j = 0; j < 40; j++) {
      const sid = studentIds[block * 40 + j];
      studentClassRows.push({ studentId: sid, classId: cidA });
      studentClassRows.push({ studentId: sid, classId: cidB });
      classStudentMap[cidA].push(sid);
      classStudentMap[cidB].push(sid);
    }
  }
  await insertBatch(StudentClass, studentClassRows);
  console.log('  완료');

  // ── 6. 공지사항: 클래스당 10개 (총 50개) ─────────────────────────────────────
  console.log('\n[6/11] 공지사항 생성 (50개)...');

  const noticeRows = Array.from({ length: 50 }, (_, i) => ({
    adminId,
    title: `[${classNames[Math.floor(i / 10)]}] 공지사항 ${(i % 10) + 1}`,
    content:
      `안녕하세요. ${classNames[Math.floor(i / 10)]} ${(i % 10) + 1}번 공지사항입니다.\n` +
      `중요 사항을 꼭 확인해 주세요. (notice-${i + 1})`,
  }));
  const firstNoticeId = await insertBatch(Notice, noticeRows);

  const classNoticeRows = Array.from({ length: 50 }, (_, i) => ({
    classId: classIds[Math.floor(i / 10)],
    noticeId: firstNoticeId + i,
    pinned: (i % 10) === 0,
  }));
  await insertBatch(ClassNotice, classNoticeRows);
  console.log('  완료');

  // ── 7. 교재: 클래스당 2개 (총 10개), 대단원 3 × 소단원 3 = 9챕터/교재 ─────────
  console.log('\n[7/11] 교재 및 챕터 생성 (교재 10개 · 챕터 90개)...');

  const textbookRows = Array.from({ length: 10 }, (_, i) => ({
    name: `기본수학 ${i + 1}권`,
    grade: (i % 3) + 1,
  }));
  const firstTextbookId = await insertBatch(Textbook, textbookRows);
  const textbookIds = Array.from({ length: 10 }, (_, i) => firstTextbookId + i);

  const chapterRows: Array<{ textbookId: number; largeUnitNo: number; smallUnitNo: number }> = [];
  for (const tbId of textbookIds) {
    for (let L = 1; L <= 3; L++) {
      for (let S = 1; S <= 3; S++) {
        chapterRows.push({ textbookId: tbId, largeUnitNo: L, smallUnitNo: S });
      }
    }
  }
  const firstChapterId = await insertBatch(TextbookChapter, chapterRows);

  const classTextbookRows = Array.from({ length: 10 }, (_, i) => ({
    classId: classIds[Math.floor(i / 2)],
    textbookId: textbookIds[i],
  }));
  const firstCtbId = await insertBatch(ClassTextbook, classTextbookRows);
  console.log('  완료');

  // ── 8. 숙제 진도: 소단원 1-1, 1-2, 1-3만 채움 ───────────────────────────────
  //  학생당 소속 클래스(2) × 클래스당 교재(2) = Progress 4개
  //  총 Progress: 200 × 4 = 800건 / ProgressChapter: 800 × 3 = 2,400건
  console.log('\n[8/11] 숙제 진도 생성 (Progress 800 · ProgressChapter 2,400)...');

  const classToCtbIds: Record<number, number[]> = {};
  for (let i = 0; i < 10; i++) {
    const cid = classIds[Math.floor(i / 2)];
    if (!classToCtbIds[cid]) classToCtbIds[cid] = [];
    classToCtbIds[cid].push(firstCtbId + i);
  }

  const progressRows: Array<{ studentId: number; classTextbookId: number }> = [];
  for (let block = 0; block < 5; block++) {
    const cidA = classIds[block];
    const cidB = classIds[(block + 1) % 5];
    for (let j = 0; j < 40; j++) {
      const sid = studentIds[block * 40 + j];
      for (const ctbId of [...classToCtbIds[cidA], ...classToCtbIds[cidB]]) {
        progressRows.push({ studentId: sid, classTextbookId: ctbId });
      }
    }
  }
  const firstProgressId = await insertBatch(Progress, progressRows);

  const progChapterRows: Array<{
    homeworkProgressId: number;
    textbookChapterId: number;
    progressPercent: number;
    status: ProgressStatus;
  }> = [];

  for (let pi = 0; pi < progressRows.length; pi++) {
    const progressId = firstProgressId + pi;
    const ctbIndex = progressRows[pi].classTextbookId - firstCtbId;
    const chapterBase = firstChapterId + ctbIndex * 9;
    for (let offset = 0; offset < 3; offset++) {
      const pct = rand(0, 100);
      progChapterRows.push({
        homeworkProgressId: progressId,
        textbookChapterId: chapterBase + offset,
        progressPercent: pct,
        status:
          pct === 100
            ? ProgressStatus.COMPLETED
            : pct > 0
              ? ProgressStatus.IN_PROGRESS
              : ProgressStatus.NOT_STARTED,
      });
    }
  }
  await insertBatch(ProgressChapter, progChapterRows);
  console.log('  완료');

  // ── 9. 학습자료: 클래스당 10개 (총 50개) ──────────────────────────────────────
  console.log('\n[9/11] 학습자료 생성 (50개)...');

  const materialRows = Array.from({ length: 50 }, (_, i) => {
    const classIdx = Math.floor(i / 10);
    const seq = (i % 10) + 1;
    return {
      adminId,
      title: `[${classNames[classIdx]}] 학습자료 ${seq}`,
      description: `${classNames[classIdx]} ${seq}번째 학습자료입니다.`,
      s3Key: `seed/${classNames[classIdx]}/material-${seq}.pdf`,
      originalFileName: `학습자료_${seq}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: rand(100_000, 5_000_000),
    };
  });
  const firstMaterialId = await insertBatch(Material, materialRows);

  const classMaterialRows = Array.from({ length: 50 }, (_, i) => ({
    classId: classIds[Math.floor(i / 10)],
    materialId: firstMaterialId + i,
  }));
  await insertBatch(ClassMaterial, classMaterialRows);
  console.log('  완료');

  // ── 10. 시험: 1·2·3월 각 20개 (총 60개), 클래스당 월 4개 = 12개 ───────────────
  //   문항 20개 × 배점 5점
  console.log('\n[10/11] 시험 생성 (Exam 60개 · ExamDetail 1,200개)...');

  // 배치 순서: month(1~3) × classIdx(0~4) × seq(0~3)
  const examRows: Array<{ classId: number; examTitle: string; examDate: Date }> = [];
  for (let month = 1; month <= 3; month++) {
    for (let ci = 0; ci < 5; ci++) {
      for (let seq = 0; seq < 4; seq++) {
        const day = seq * 7 + 5; // 5, 12, 19, 26일
        examRows.push({
          classId: classIds[ci],
          examTitle: `${month}월 ${seq + 1}차 ${classNames[ci]} 시험`,
          examDate: new Date(
            `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T10:00:00`,
          ),
        });
      }
    }
  }
  const firstExamId = await insertBatch(Exam, examRows);

  // ExamDetail: 시험당 20문항 × 배점 5점
  // 순서: exam0 q1..q20, exam1 q1..q20, ..., exam59 q1..q20
  // → firstExamDetailId + examIdx*20 + qOffset (0-based)
  const examDetailRows: Array<{ examId: number; question: number; points: number }> = [];
  for (let i = 0; i < 60; i++) {
    const eid = firstExamId + i;
    for (let q = 1; q <= 20; q++) {
      examDetailRows.push({ examId: eid, question: q, points: 5 });
    }
  }
  const firstExamDetailId = await insertBatch(ExamDetail, examDetailRows);
  console.log('  완료');

  // ── 11. 성적 + 오답 + 오답률 + 순위 ─────────────────────────────────────────
  console.log('\n[11/11] 성적 생성 및 순위·오답률 계산...');

  // ── 11-A. 오답 계획 생성 ────────────────────────────────────────────────────
  //  gradeIdx = examIdx * 40 + studentIdx (40명/클래스 고정)
  //  wrongCount:
  //    10% 확률 → 0개 (100점)
  //    90% 확률 → 1~15개 (점수 25~95점, 5점 단위)
  type WrongPlan = { wrongCount: number; wrongDetailOffsets: number[] };
  const wrongPlans: WrongPlan[] = [];

  for (let examIdx = 0; examIdx < 60; examIdx++) {
    const studentsForExam = classStudentMap[examRows[examIdx].classId];
    for (let si = 0; si < studentsForExam.length; si++) {
      const wrongCount = Math.random() < 0.1 ? 0 : rand(1, 15);
      wrongPlans.push({
        wrongCount,
        wrongDetailOffsets: pickRandom(20, wrongCount),
      });
    }
  }

  // ── 11-B. Grade 삽입 (점수 포함) ────────────────────────────────────────────
  console.log('  성적 삽입 (4,800건)...');
  const gradeRows: Array<{
    examId: number;
    studentId: number;
    score: number;
    isTaken: boolean;
  }> = [];

  for (let examIdx = 0; examIdx < 60; examIdx++) {
    const studentsForExam = classStudentMap[examRows[examIdx].classId];
    for (let si = 0; si < studentsForExam.length; si++) {
      const planIdx = examIdx * 40 + si;
      gradeRows.push({
        examId: firstExamId + examIdx,
        studentId: studentsForExam[si],
        score: 100 - wrongPlans[planIdx].wrongCount * 5,
        isTaken: true,
      });
    }
  }
  const firstGradeId = await insertBatch(Grade, gradeRows);

  // ── 11-C. GradeWrongAnswer 삽입 ─────────────────────────────────────────────
  //  grade_detail 테이블: 틀린 문항만 삽입 (isCorrect = false 기본값)
  console.log('  오답 삽입...');
  const gradeDetailRows: Array<{ gradeId: number; examDetailId: number }> = [];

  for (let planIdx = 0; planIdx < wrongPlans.length; planIdx++) {
    const { wrongDetailOffsets } = wrongPlans[planIdx];
    if (wrongDetailOffsets.length === 0) continue; // 100점 → 삽입 없음

    const gradeId = firstGradeId + planIdx;
    const examIdx = Math.floor(planIdx / 80);
    const baseDetailId = firstExamDetailId + examIdx * 20;

    for (const offset of wrongDetailOffsets) {
      gradeDetailRows.push({ gradeId, examDetailId: baseDetailId + offset });
    }
  }
  await insertBatch(GradeWrongAnswer, gradeDetailRows);
  console.log(`  오답 ${gradeDetailRows.length}건 삽입 완료`);

  // ── 11-D. 문항별 오답률(errorRate) 갱신 ─────────────────────────────────────
  //  오답률 = 오답자 수 / 응시자 수(40) × 100
  //  서비스 로직(calculateExamErrorRates)과 동일
  console.log('  오답률 계산 및 갱신 (exam_detail 1,200건)...');

  const errorRateUpdates: Array<{ examDetailId: number; errorRate: string }> = [];
  for (let examIdx = 0; examIdx < 60; examIdx++) {
    const wrongCountByOffset = new Array(20).fill(0) as number[];

    for (let si = 0; si < 80; si++) {
      for (const offset of wrongPlans[examIdx * 80 + si].wrongDetailOffsets) {
        wrongCountByOffset[offset]++;
      }
    }

    const baseDetailId = firstExamDetailId + examIdx * 20;
    for (let q = 0; q < 20; q++) {
      errorRateUpdates.push({
        examDetailId: baseDetailId + q,
        errorRate: ((wrongCountByOffset[q] / 80) * 100).toFixed(2),
      });
    }
  }

  // CASE WHEN 벌크 업데이트
  for (const batch of chunk(errorRateUpdates, 500)) {
    const ids = batch.map((u) => u.examDetailId).join(',');
    const cases = batch
      .map((u) => `WHEN ${u.examDetailId} THEN ${u.errorRate}`)
      .join(' ');
    await AppDataSource.query(
      `UPDATE exam_detail SET error_rate = CASE exam_detail_id ${cases} END WHERE exam_detail_id IN (${ids})`,
    );
  }

  // ── 11-E. 반 내 순위(ranking) 갱신 ──────────────────────────────────────────
  //  서비스 로직(calculateExamRankings)과 동일:
  //    score DESC 정렬 후 동점이면 gradeId ASC,
  //    동점자는 같은 순위 (1, 1, 3 방식: rank = 배열상 위치+1)
  console.log('  순위 계산 및 갱신 (grade 4,800건)...');

  const rankingUpdates: Array<{ gradeId: number; ranking: number }> = [];
  for (let examIdx = 0; examIdx < 60; examIdx++) {
    const gradesForExam: Array<{ gradeId: number; score: number }> = [];

    for (let si = 0; si < 80; si++) {
      const planIdx = examIdx * 80 + si;
      gradesForExam.push({
        gradeId: firstGradeId + planIdx,
        score: 100 - wrongPlans[planIdx].wrongCount * 5,
      });
    }

    // score DESC, gradeId ASC (동점 tie-break)
    gradesForExam.sort((a, b) => b.score - a.score || a.gradeId - b.gradeId);

    let rank = 1;
    let prevScore: number | null = null;
    for (let i = 0; i < gradesForExam.length; i++) {
      const g = gradesForExam[i];
      if (prevScore === null || g.score !== prevScore) {
        rank = i + 1;
        prevScore = g.score;
      }
      rankingUpdates.push({ gradeId: g.gradeId, ranking: rank });
    }
  }

  for (const batch of chunk(rankingUpdates, 500)) {
    const ids = batch.map((u) => u.gradeId).join(',');
    const cases = batch
      .map((u) => `WHEN ${u.gradeId} THEN ${u.ranking}`)
      .join(' ');
    await AppDataSource.query(
      `UPDATE grade SET ranking = CASE grade_id ${cases} END WHERE grade_id IN (${ids})`,
    );
  }

  console.log('  완료');

  // ── 완료 요약 ────────────────────────────────────────────────────────────────
  const hundredCount = wrongPlans.filter((p) => p.wrongCount === 0).length;
  const avgWrong = (
    wrongPlans.reduce((sum, p) => sum + p.wrongCount, 0) / wrongPlans.length
  ).toFixed(1);

  console.log('\n' + '━'.repeat(60));
  console.log('  시딩 완료 요약');
  console.log('━'.repeat(60));
  console.log(`  User:            ${1 + 100 + 200}명 (Admin 1 · Parent 100 · Student 200)`);
  console.log(`  Class:           ${classIds.length}개`);
  console.log(`  StudentClass:    ${studentClassRows.length}건 (클래스당 40명)`);
  console.log(`  Notice:          ${noticeRows.length}개 · ClassNotice: ${classNoticeRows.length}건`);
  console.log(`  Textbook:        ${textbookRows.length}개 · Chapter: ${chapterRows.length}개`);
  console.log(`  ClassTextbook:   ${classTextbookRows.length}건`);
  console.log(`  Progress:        ${progressRows.length}건 · ProgressChapter: ${progChapterRows.length}건`);
  console.log(`  Material:        ${materialRows.length}개 · ClassMaterial: ${classMaterialRows.length}건`);
  console.log(`  Exam:            ${examRows.length}개 · ExamDetail: ${examDetailRows.length}건`);
  console.log(`  Grade:           ${gradeRows.length}건`);
  console.log(`  GradeWrongAnswer: ${gradeDetailRows.length}건`);
  console.log(`  100점 학생:       ${hundredCount}건 (${((hundredCount / gradeRows.length) * 100).toFixed(1)}%)`);
  console.log(`  평균 오답 수:     ${avgWrong}개`);
  console.log(`  ErrorRate 갱신:  ${errorRateUpdates.length}건`);
  console.log(`  Ranking 갱신:    ${rankingUpdates.length}건`);
  console.log('━'.repeat(60));

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('\n시딩 실패:', err);
  if (AppDataSource.isInitialized) void AppDataSource.destroy();
  process.exit(1);
});
