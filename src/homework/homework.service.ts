import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, In, Repository } from 'typeorm';
import { TextbookChapter } from './../textbook/entities/textbook-chapter.entity';
import { Student } from './../students/entities/student.entity';
import { User } from './../users/entities/user.entity';
import { Progress } from './entities/progress.entity';
import {
  ProgressChapter,
  ProgressStatus,
} from './entities/progress-chapter.entity';
import { ClassTextbook } from '../class-textbook/entities/class-textbook.entity';
import { MESSAGES } from '../constants/message.constant';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { BulkUpdateProgressCellsDto } from './dto/bulk-update-progress-cells.dto';
import { Parent } from './../parents/entities/parent.entity';

function statusFromPercent(percent: number): ProgressStatus {
  if (percent <= 0) return ProgressStatus.NOT_STARTED;
  if (percent >= 100) return ProgressStatus.COMPLETED;
  return ProgressStatus.IN_PROGRESS;
}
@Injectable()
export class HomeworkService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ClassTextbook)
    private readonly classTextbookRepo: Repository<ClassTextbook>,
    @InjectRepository(StudentClass)
    private readonly studentClassRepo: Repository<StudentClass>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TextbookChapter)
    private readonly chapterRepo: Repository<TextbookChapter>,
    @InjectRepository(Progress)
    private readonly progressRepo: Repository<Progress>,
    @InjectRepository(ProgressChapter)
    private readonly progressChapterRepo: Repository<ProgressChapter>,
    @InjectRepository(TextbookChapter)
    private readonly textbookChapterRepo: Repository<TextbookChapter>,
    @InjectRepository(Parent)
    private readonly parentRepo: Repository<Parent>,
  ) {}

  // 숙제 진도 목록 조회
  async getHomeworkProgress(classId: number, textbookId: number) {
    // 1) class_textbook 존재 검증 + classTextbookId 확보 (반에서 실제 사용하는 교재인지)
    const classTextbook = await this.classTextbookRepo.findOne({
      where: { classId, textbookId },
      select: { classTextbookId: true, classId: true, textbookId: true },
    });
    if (!classTextbook)
      throw new NotFoundException(
        MESSAGES.ADMIN.HOMEWORK.ERROR.CLASS_TEXTBOOK_NOT_FOUND,
      );

    const classTextbookId = classTextbook.classTextbookId;

    // 2) 반 학생 목록(행) 조회: studentIds
    const studentLinks = await this.studentClassRepo.find({
      where: { classId },
      select: { studentId: true },
    });
    const studentIds = studentLinks.map((x) => x.studentId);

    // 학생이 없으면 단원만 내려주고 종료해도 됨(선택)
    // 그래도 단원은 내려주는 게 UI 구성에 편함
    const chapters = await this.chapterRepo.find({
      where: { textbookId },
      select: { textbookChapterId: true, largeUnitNo: true, smallUnitNo: true },
      order: { largeUnitNo: 'ASC', smallUnitNo: 'ASC' },
    });

    const chapterDtos = chapters.map((c) => ({
      chapterId: c.textbookChapterId,
      largeUnitNo: c.largeUnitNo,
      smallUnitNo: c.smallUnitNo,
      label: `${c.largeUnitNo}-${c.smallUnitNo}`,
    }));

    if (studentIds.length === 0) {
      return {
        classId,
        textbookId,
        classTextbookId,
        chapters: chapterDtos,
        students: [],
      };
    }

    // 3) 학생 이름 확보 (Student.userId -> User.name)
    //    (학생 테이블에 name이 있으면 user 조인 없이 student에서 바로 뽑아도 됨)
    const studentsWithName = await this.studentRepo
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .where('s.studentId IN (:...studentIds)', { studentIds }) //
      .select([
        's.studentId AS studentId',
        's.userId AS userId', //
        'u.name AS name',
      ])
      .getRawMany<{ studentId: number; userId: number; name: string }>(); //

    const userNameMap = new Map(
      studentsWithName.map((s) => [s.userId, s.name]), //
    );

    // 4) 셀 데이터 조회 (ProgressChapter JOIN Progress 한 방)
    //    - class_textbook_id 기준으로 progress를 좁히고
    //    - studentIds IN으로 반 학생만
    const rawCells = await this.progressChapterRepo
      .createQueryBuilder('pc')
      .innerJoin(
        Progress,
        'p',
        [
          'p.homework_progress_id = pc.homework_progress_id',
          'p.deleted_at IS NULL',
          'p.class_textbook_id = :classTextbookId',
        ].join(' AND '),
        { classTextbookId },
      )
      .andWhere('p.student_id IN (:...studentIds)', { studentIds })
      .select([
        'p.student_id AS studentId',
        'pc.textbook_chapter_id AS chapterId',
        'pc.status AS status',
        'pc.progress_percent AS percent',
        'pc.updated_at AS updatedAt',
      ])
      .getRawMany<{
        studentId: number;
        chapterId: number;
        status: string;
        percent: number;
        updatedAt: Date;
      }>();

    // 5) studentId -> (chapterId -> cell) 매핑
    const cellMap = new Map<
      number,
      Map<number, { status: any; percent: number; updatedAt: string }>
    >();
    for (const r of rawCells) {
      if (!cellMap.has(r.studentId)) cellMap.set(r.studentId, new Map());
      cellMap.get(r.studentId)!.set(r.chapterId, {
        status: r.status,
        percent: r.percent,
        updatedAt: new Date(r.updatedAt).toISOString(),
      });
    }

    // 6) 그리드 조립(없는 칸 null)
    const studentRows = studentsWithName.map((s) => {
      const name = userNameMap.get(s.userId) ?? '(unknown)';
      const m = cellMap.get(s.studentId) ?? new Map<number, any>();

      const cells: Record<number, any | null> = {};
      for (const ch of chapters) {
        const chapterId = ch.textbookChapterId;
        cells[chapterId] = m.get(chapterId) ?? null;
      }

      return { studentId: s.studentId, name, cells };
    });

    return {
      classId,
      textbookId,
      classTextbookId,
      chapters: chapterDtos,
      students: studentRows,
    };
  }

  // 숙제 진도 수정
  async updateHomeworkProgress(
    classId: number,
    textbookId: number,
    dto: BulkUpdateProgressCellsDto,
  ) {
    if (!dto.items?.length)
      throw new BadRequestException(
        MESSAGES.ADMIN.HOMEWORK.ERROR.NO_UPDATE_ITEMS,
      );

    // 1) class_textbook_id 확보 + 반에서 쓰는 교재인지 검증
    const classTextbook = await this.classTextbookRepo.findOne({
      where: { classId, textbookId },
      select: { classTextbookId: true, classId: true, textbookId: true },
    });
    if (!classTextbook)
      throw new NotFoundException(
        MESSAGES.ADMIN.HOMEWORK.ERROR.CLASS_TEXTBOOK_NOT_FOUND,
      );

    const classTextbookId = classTextbook.classTextbookId;

    // 2) payload dedupe(같은 studentId+chapterId가 여러 번 오면 마지막 값만 적용)
    const dedup = new Map<
      string,
      { studentId: number; chapterId: number; percent: number }
    >();
    for (const it of dto.items) {
      dedup.set(`${it.studentId}:${it.chapterId}`, {
        studentId: it.studentId,
        chapterId: it.chapterId,
        percent: it.percent,
      });
    }
    const items = [...dedup.values()];

    const studentIds = [...new Set(items.map((x) => x.studentId))];
    const chapterIds = [...new Set(items.map((x) => x.chapterId))];

    // 3) 학생이 해당 반 소속인지 검증
    const validStudents = await this.studentClassRepo.find({
      where: { classId, studentId: In(studentIds) },
      select: { studentId: true },
    });
    const validStudentSet = new Set(validStudents.map((s) => s.studentId));
    const invalidStudentIds = studentIds.filter(
      (id) => !validStudentSet.has(id),
    );
    if (invalidStudentIds.length) {
      throw new BadRequestException(
        `반에 속하지 않은 학생이 포함되어 있습니다: ${invalidStudentIds.join(', ')}`,
      );
    }

    // 4) 단원이 해당 교재 소속인지 검증
    const validChapters = await this.textbookChapterRepo.find({
      where: { textbookId, textbookChapterId: In(chapterIds) },
      select: { textbookChapterId: true },
    });
    const validChapterSet = new Set(
      validChapters.map((c) => c.textbookChapterId),
    );
    const invalidChapterIds = chapterIds.filter(
      (id) => !validChapterSet.has(id),
    );
    if (invalidChapterIds.length) {
      throw new BadRequestException(
        `해당 교재에 없는 단원이 포함되어 있습니다: ${invalidChapterIds.join(', ')}`,
      );
    }

    // 5) 트랜잭션: progress(헤더) 보장 + progress_chapter(셀) upsert
    const updated = await this.dataSource.transaction(async (manager) => {
      const progressRepo = manager.getRepository(Progress);
      const progressChapterRepo = manager.getRepository(ProgressChapter);

      // 5-1) 기존 progress(헤더) 조회
      const existingProgress = await progressRepo.find({
        where: {
          classTextbookId,
          studentId: In(studentIds),
        },
        select: { homeworkProgressId: true, studentId: true },
      });

      const studentToProgressId = new Map(
        existingProgress.map((p) => [p.studentId, p.homeworkProgressId]),
      );
      const missingStudentIds = studentIds.filter(
        (sid) => !studentToProgressId.has(sid),
      );

      // 5-2) 없는 헤더는 생성(중복 방지 위해 UNIQUE(class_textbook_id, student_id) 권장)
      if (missingStudentIds.length) {
        await progressRepo
          .createQueryBuilder()
          .insert()
          .into(Progress)
          .values(
            missingStudentIds.map((sid) => ({
              classTextbookId,
              studentId: sid,
            })),
          )
          .orIgnore() // MySQL: 중복이면 무시(UNIQUE 있어야 안전)
          .execute();

        // 생성 후 다시 조회해서 매핑 완성
        const filled = await progressRepo.find({
          where: {
            classTextbookId,
            studentId: In(missingStudentIds),
          },
          select: { homeworkProgressId: true, studentId: true },
        });
        for (const p of filled)
          studentToProgressId.set(p.studentId, p.homeworkProgressId);
      }

      // 5-3) 셀 upsert 데이터 구성
      const cellRows = items.map((it) => {
        const progressId = studentToProgressId.get(it.studentId);
        if (!progressId) {
          // 이론상 여기 오면 안 됨(앞 단계에서 보장)
          throw new BadRequestException(
            MESSAGES.ADMIN.HOMEWORK.ERROR.PROGRESS_NOT_FOUND,
          );
        }
        const status = statusFromPercent(it.percent);
        return {
          homeworkProgressId: progressId,
          textbookChapterId: it.chapterId,
          status,
          progressPercent: it.percent,
          // updatedAt은 엔티티에서 UpdateDateColumn이면 생략 가능
        };
      });

      // 5-4) upsert (UNIQUE(homework_progress_id, textbook_chapter_id) 필요)
      await progressChapterRepo
        .createQueryBuilder()
        .insert()
        .into(ProgressChapter)
        .values(cellRows) // 여기에는 엔티티 프로퍼티명 써도 OK
        .orUpdate(
          ['status', 'progress_percent'],
          ['homework_progress_id', 'textbook_chapter_id'],
        )
        .execute();

      return cellRows.length;
    });

    return { updated };
  }

  // 학생 본인의 숙제 진도 목록 조회
  async getMyHomeworkProgress(
    classId: number,
    textbookId: number,
    userId: number,
  ) {
    // 1) 학생 식별
    const student = await this.studentRepo.findOne({
      where: { userId },
      select: { studentId: true, userId: true },
    });
    if (!student) {
      throw new NotFoundException(MESSAGES.STUDENTS.ERROR.NOT_FOUND);
    }

    // 2) 학생이 해당 반 소속인지 검증 (IDOR 방지)
    const link = await this.studentClassRepo.findOne({
      where: {
        classId,
        studentId: student.studentId,
      },
      select: { studentId: true },
    });

    if (!link) {
      throw new NotFoundException(MESSAGES.STUDENTS.CLASS.ERROR.NOT_FOUND);
      // 또는 FORBIDDEN 성격이면 403로 정책화 가능
    }

    // 3) class_textbook 존재 검증 + classTextbookId 확보 (해당 반에서 쓰는 교재인지)
    const classTextbook = await this.classTextbookRepo.findOne({
      where: { classId, textbookId },
      select: { classTextbookId: true, classId: true, textbookId: true },
    });
    if (!classTextbook) {
      throw new NotFoundException(
        MESSAGES.ADMIN.HOMEWORK.ERROR.CLASS_TEXTBOOK_NOT_FOUND,
      );
    }
    const classTextbookId = classTextbook.classTextbookId;

    // 4) 교재 단원 목록 (컬럼 최소)
    const chapters = await this.chapterRepo.find({
      where: { textbookId },
      select: { textbookChapterId: true, largeUnitNo: true, smallUnitNo: true },
      order: { largeUnitNo: 'ASC', smallUnitNo: 'ASC' },
    });

    const chapterDtos = chapters.map((c) => ({
      chapterId: c.textbookChapterId,
      largeUnitNo: c.largeUnitNo,
      smallUnitNo: c.smallUnitNo,
      label: `${c.largeUnitNo}-${c.smallUnitNo}`,
    }));

    // 5) 내 이름 (User.name)
    const user = await this.userRepo.findOne({
      where: { userId: student.userId },
      select: { userId: true, name: true },
    });
    const name = user?.name ?? '(unknown)';

    // 6) 내 progress 헤더 1개 조회 (없으면 아직 시작 전)
    const progress = await this.progressRepo.findOne({
      where: { classTextbookId, studentId: student.studentId },
      select: { homeworkProgressId: true },
    });

    // progress가 없으면 셀은 전부 null
    if (!progress) {
      const cells: Record<number, any | null> = {};
      for (const ch of chapters) cells[ch.textbookChapterId] = null;

      return {
        classId,
        textbookId,
        classTextbookId,
        chapters: chapterDtos,
        student: {
          studentId: student.studentId,
          name,
          cells,
        },
      };
    }

    // 7) 내 셀(progress_chapter)만 조회
    const rawCells = await this.progressChapterRepo
      .createQueryBuilder('pc')
      .where('pc.homework_progress_id = :progressId', {
        progressId: progress.homeworkProgressId,
      })
      .select([
        'pc.textbook_chapter_id AS chapterId',
        'pc.status AS status',
        'pc.progress_percent AS percent',
        'pc.updated_at AS updatedAt',
      ])
      .getRawMany<{
        chapterId: number;
        status: string;
        percent: number;
        updatedAt: Date;
      }>();

    const cellMap = new Map<
      number,
      { status: string; percent: number; updatedAt: string }
    >();
    for (const r of rawCells) {
      cellMap.set(Number(r.chapterId), {
        status: r.status,
        percent: Number(r.percent),
        updatedAt: new Date(r.updatedAt).toISOString(),
      });
    }

    const cells: Record<number, any | null> = {};
    for (const ch of chapters) {
      const chapterId = ch.textbookChapterId;
      cells[chapterId] = cellMap.get(chapterId) ?? null;
    }

    return {
      classId,
      textbookId,
      classTextbookId,
      chapters: chapterDtos,
      student: {
        studentId: student.studentId,
        name,
        cells,
      },
    };
  }

  //내 자녀의 숙제 진도 목록 조회
  async getMyChildHomeworkProgress(
    parentUserId: number,
    studentId: number,
    classId: number,
    textbookId: number,
  ) {
    // 1) parent 식별 (내 계정이 학부모인지 + parentId 확보)
    const parent = await this.parentRepo.findOne({
      where: { userId: parentUserId },
      select: { parentId: true },
    });
    if (!parent) {
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }

    // 2) studentId가 내 자녀인지 검증 (IDOR 방지)
    const child = await this.studentRepo.findOne({
      where: { studentId, parentId: parent.parentId },
      select: { studentId: true, userId: true },
    });
    if (!child) {
      throw new NotFoundException(MESSAGES.PARENTS.STUDENT.ERROR.NOT_FOUND);
    }

    // 3) 자녀가 해당 반 소속인지 검증
    const link = await this.studentClassRepo.findOne({
      where: { classId, studentId: child.studentId },
      select: { studentId: true },
    });
    if (!link) {
      throw new NotFoundException(MESSAGES.PARENTS.CLASS.ERROR.NOT_FOUND);
    }

    // 4) class_textbook 존재 검증 + classTextbookId 확보 (반에서 실제 사용하는 교재인지)
    const classTextbook = await this.classTextbookRepo.findOne({
      where: { classId, textbookId },
      select: { classTextbookId: true, classId: true, textbookId: true },
    });
    if (!classTextbook) {
      throw new NotFoundException(
        MESSAGES.PARENTS.HOMEWORK.ERROR.CLASS_TEXTBOOK_NOT_FOUND,
      );
    }
    const classTextbookId = classTextbook.classTextbookId;

    // 5) 교재 단원 목록
    const chapters = await this.chapterRepo.find({
      where: { textbookId },
      select: { textbookChapterId: true, largeUnitNo: true, smallUnitNo: true },
      order: { largeUnitNo: 'ASC', smallUnitNo: 'ASC' },
    });

    const chapterDtos = chapters.map((c) => ({
      chapterId: c.textbookChapterId,
      largeUnitNo: c.largeUnitNo,
      smallUnitNo: c.smallUnitNo,
      label: `${c.largeUnitNo}-${c.smallUnitNo}`,
    }));

    // 6) 자녀 이름
    const user = await this.userRepo.findOne({
      where: { userId: child.userId },
      select: { userId: true, name: true },
    });
    const name = user?.name ?? '(unknown)';

    // 7) progress 헤더 1개 조회 (없으면 아직 시작 전)
    const progress = await this.progressRepo.findOne({
      where: { classTextbookId, studentId: child.studentId },
      select: { homeworkProgressId: true },
    });

    if (!progress) {
      const cells: Record<number, any | null> = {};
      for (const ch of chapters) cells[ch.textbookChapterId] = null;

      return {
        classId,
        textbookId,
        classTextbookId,
        chapters: chapterDtos,
        student: {
          studentId: child.studentId,
          name,
          cells,
        },
      };
    }

    // 8) 자녀 셀(progress_chapter)만 조회
    const rawCells = await this.progressChapterRepo
      .createQueryBuilder('pc')
      .where('pc.homework_progress_id = :progressId', {
        progressId: progress.homeworkProgressId,
      })
      .select([
        'pc.textbook_chapter_id AS chapterId',
        'pc.status AS status',
        'pc.progress_percent AS percent',
        'pc.updated_at AS updatedAt',
      ])
      .getRawMany<{
        chapterId: number;
        status: string;
        percent: number;
        updatedAt: Date;
      }>();

    const cellMap = new Map<
      number,
      { status: string; percent: number; updatedAt: string }
    >();
    for (const r of rawCells) {
      cellMap.set(Number(r.chapterId), {
        status: r.status,
        percent: Number(r.percent),
        updatedAt: new Date(r.updatedAt).toISOString(),
      });
    }

    const cells: Record<number, any | null> = {};
    for (const ch of chapters) {
      const chapterId = ch.textbookChapterId;
      cells[chapterId] = cellMap.get(chapterId) ?? null;
    }

    return {
      classId,
      textbookId,
      classTextbookId,
      chapters: chapterDtos,
      student: {
        studentId: child.studentId,
        name,
        cells,
      },
    };
  }
}
