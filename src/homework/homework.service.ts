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
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TextbookChapter)
    private readonly chapterRepo: Repository<TextbookChapter>,
    @InjectRepository(Progress)
    private readonly progressRepo: Repository<Progress>,
    @InjectRepository(ProgressChapter)
    private readonly progressChapterRepo: Repository<ProgressChapter>,
    @InjectRepository(TextbookChapter)
    private readonly textbookChapterRepo: Repository<TextbookChapter>,
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
    const students = await this.studentRepo.find({
      where: { studentId: In(studentIds) },
      select: { studentId: true, userId: true },
    });

    const userIds = students.map((s) => s.userId);
    const users = await this.userRepo.find({
      where: { userId: In(userIds) },
      select: { userId: true, name: true },
    });
    const userNameMap = new Map(users.map((u) => [u.userId, u.name]));

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
    const studentRows = students.map((s) => {
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
      await progressChapterRepo.upsert(cellRows, {
        conflictPaths: ['homeworkProgressId', 'textbookChapterId'],
        skipUpdateIfNoValuesChanged: false,
      });

      return cellRows.length;
    });

    return { updated };
  }
}
