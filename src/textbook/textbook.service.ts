import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Textbook } from './entities/textbook.entity';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { CreateTextbookDto } from './dto/create-textbook.dto';
import { Admin } from './../admin/entities/admin.entity';
import { MESSAGES } from '../constants/message.constant';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { TextbookChapter } from './entities/textbook-chapter.entity';
import { UpdateTextbookDto } from './dto/update-textbook.dto';
import { ClassTextbook } from '../class-textbook/entities/class-textbook.entity';
import { Class } from './../class/entities/class.entity';
import { ProgressChapter } from '../homework/entities/progress-chapter.entity';

@Injectable()
export class TextbookService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Textbook)
    private readonly textbookRepository: Repository<Textbook>,
    @InjectRepository(TextbookChapter)
    private readonly textbookChapterRepository: Repository<TextbookChapter>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
    @InjectRepository(ClassTextbook)
    private readonly classTextbookRepository: Repository<ClassTextbook>,
  ) {}

  // 교재 생성
  async createTextbook(
    { name, grade, units, classList }: CreateTextbookDto,
    userIdOfAdmin: number,
  ) {
    const admin = await this.adminRepository.existsBy({
      userId: userIdOfAdmin,
    });
    if (!admin) {
      throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
    }

    return this.dataSource.transaction(async (manager) => {
      const textbookRepo = manager.getRepository(Textbook);
      const chapterRepo = manager.getRepository(TextbookChapter);
      const logRepo = manager.getRepository(ActionLog);
      const classTextbookRepo = manager.getRepository(ClassTextbook);

      // 1) 교재 생성
      const textbook = await textbookRepo.save({
        name,
        grade,
      });

      /// 2) 단원(챕터) 생성: 대단원별 소단원 수 반영
      // units = [2,1,1]
      // => (1,1)(1,2)(2,1)(3,1)

      if (units && units.length > 0) {
        const chapters: Array<{
          textbookId: number;
          largeUnitNo: number;
          smallUnitNo: number;
        }> = [];

        for (let li = 0; li < units.length; li++) {
          const smallCount = units[li];
          const largeUnitNo = li + 1;

          for (let si = 0; si < smallCount; si++) {
            chapters.push({
              textbookId: textbook.textbookId,
              largeUnitNo,
              smallUnitNo: si + 1,
            });
          }
        }

        // 3) 벌크 INSERT (동시성 안전)
        await this.insertChaptersIgnore(manager, chapters);
      }

      // 4) 교재 - 반 테이블 벌크 INSERT (동시성 안전)
      await this.insertClassTextbooksIgnore(
        manager,
        textbook.textbookId,
        classList ?? [],
      );

      // 5) 로그 저장
      await logRepo.insert({
        actorId: userIdOfAdmin,
        actorType: 'admin',
        action: 'CREATE_TEXTBOOK',
        targetType: 'textbook',
        targetId: textbook.textbookId,
        description: `Admin created a textbook (textbookId: ${textbook.textbookId})`,
        createdAt: new Date(),
      });

      return textbook;
    });
  }

  // 교재 목록 조회
  async getAllTextbooks() {
    const textbooks = await this.textbookRepository.find({
      where: { deletedAt: IsNull() },
      select: {
        textbookId: true,
        name: true,
        grade: true,
        createdAt: true,
      },
    });
    return textbooks;
  }

  // 교재 상세 조회
  async getTextbookById(textbookId: number) {
    const rows = await this.textbookRepository
      .createQueryBuilder('t')
      .leftJoin('t.classTextbooks', 'ct')
      .leftJoin('ct.clazz', 'c')
      .select([
        't.textbookId AS textbookId',
        't.name AS name',
        't.grade AS grade',
        'ct.classTextbookId AS classTextbookId',
        'c.classId AS classId',
        'c.className AS className',
      ])
      .where('t.textbookId = :textbookId', { textbookId })
      .andWhere('t.deletedAt IS NULL')
      .getRawMany();

    if (rows.length === 0) {
      throw new NotFoundException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NOT_FOUND);
    }

    const first = rows[0];

    return {
      textbookId: Number(first.textbookId),
      name: first.name,
      grade: Number(first.grade),
      classTextbooks: rows
        .filter((r) => r.classTextbookId != null) // 연결이 없을 수도 있으니 방어
        .map((r) => ({
          classTextbookId: Number(r.classTextbookId),
          clazz: r.classId
            ? { classId: Number(r.classId), className: r.className }
            : null,
        })),
    };
  }

  // 교재 수정
  async updateTextbook(
    dto: UpdateTextbookDto,
    userIdOfAdmin: number,
    textbookId: number,
  ) {
    const { name, grade, units, classList } = dto;

    return this.dataSource.transaction(async (manager) => {
      const textbookRepo = manager.getRepository(Textbook);
      const classTextbookRepo = manager.getRepository(ClassTextbook);
      const classRepo = manager.getRepository(Class);
      const chapterRepo = manager.getRepository(TextbookChapter);
      const progressChapterRepo = manager.getRepository(ProgressChapter);
      const actionLogRepo = manager.getRepository(ActionLog);

      // 1) 교재 확인
      const textbook = await textbookRepo.findOne({
        where: { textbookId, deletedAt: IsNull() },
        select: {
          name: true,
          grade: true,
        },
      });
      if (!textbook) {
        throw new NotFoundException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NOT_FOUND);
      }

      // 2) patch 계산 (name/grade)
      const patch: Partial<Textbook> = {};
      const nameChange =
        typeof name === 'string' &&
        name.trim() !== '' &&
        name !== textbook.name;
      const gradeChange = typeof grade === 'number' && grade !== textbook.grade;

      if (nameChange) patch.name = name;
      if (gradeChange) patch.grade = grade;

      // 3) classList 정규화 + diff
      const wantClassIds = Array.isArray(classList)
        ? Array.from(new Set(classList))
        : undefined;

      let toDeleteClasses: number[] = [];
      let toInsertClasses: number[] = [];

      if (wantClassIds !== undefined) {
        if (wantClassIds.length > 0) {
          const existed = await classRepo.find({
            select: { classId: true },
            where: { classId: In(wantClassIds) },
          });
          if (existed.length !== wantClassIds.length) {
            throw new BadRequestException(
              MESSAGES.ADMIN.TEXTBOOK.ERROR.INVALID_CLASS_ID,
            );
          }
        }

        const existingLinks = await classTextbookRepo.find({
          select: { classId: true },
          where: { textbookId },
        });
        const existingSet = new Set(existingLinks.map((l) => l.classId));
        const wantSet = new Set(wantClassIds);

        toDeleteClasses = Array.from(existingSet).filter(
          (id) => !wantSet.has(id),
        );
        toInsertClasses = wantClassIds.filter((id) => !existingSet.has(id));
      }

      const classChangeExists =
        wantClassIds !== undefined &&
        (toDeleteClasses.length > 0 || toInsertClasses.length > 0);

      // 4) ✅ units 변경(diff) 계산
      // units가 들어온 경우에만 챕터 변경 처리
      let toInsertChapters: Array<{
        textbookId: number;
        largeUnitNo: number;
        smallUnitNo: number;
      }> = [];
      let toDeleteChapterIds: number[] = [];

      const unitsChangeRequested = Array.isArray(units);
      if (unitsChangeRequested && units.length === 0) {
        throw new BadRequestException(
          MESSAGES.ADMIN.TEXTBOOK.ERROR.UNITS_INVALID_FORMAT,
        );
      }
      if (unitsChangeRequested) {
        // 4-1) 현재 챕터 목록 조회
        const existingChapters = await chapterRepo.find({
          where: { textbookId },
          select: {
            textbookChapterId: true,
            largeUnitNo: true,
            smallUnitNo: true,
          },
        });

        // 4-2) 원하는 챕터 Key 집합 생성
        // key = `${large}-${small}`
        const wantKeySet = new Set<string>();
        for (let li = 0; li < units.length; li++) {
          const largeNo = li + 1;
          const smallCount = units[li];
          for (let si = 0; si < smallCount; si++) {
            const smallNo = si + 1;
            wantKeySet.add(`${largeNo}-${smallNo}`);
          }
        }

        // 4-3) 기존 챕터를 key로 맵핑
        const existingKeyToId = new Map<string, number>();
        for (const ch of existingChapters) {
          existingKeyToId.set(
            `${ch.largeUnitNo}-${ch.smallUnitNo}`,
            ch.textbookChapterId,
          );
        }

        // 4-4) toInsert: want - existing
        for (const key of wantKeySet) {
          if (!existingKeyToId.has(key)) {
            const [largeUnitNoStr, smallUnitNoStr] = key.split('-');
            toInsertChapters.push({
              textbookId,
              largeUnitNo: Number(largeUnitNoStr),
              smallUnitNo: Number(smallUnitNoStr),
            });
          }
        }

        // 4-5) toDelete: existing - want
        for (const [key, id] of existingKeyToId.entries()) {
          if (!wantKeySet.has(key)) {
            toDeleteChapterIds.push(id);
          }
        }

        // 4-6) 삭제 대상 챕터에 진행 데이터가 있으면 축소 금지 (정책 A)
        if (toDeleteChapterIds.length > 0) {
          const usedCount = await progressChapterRepo.count({
            where: { textbookChapterId: In(toDeleteChapterIds) },
          });
          if (usedCount > 0) {
            throw new BadRequestException(
              MESSAGES.ADMIN.TEXTBOOK.ERROR.CANNOT_SHRINK_CHAPTER_WITH_PROGRESS,
            );
          }
        }
      }

      const chapterChangeExists =
        unitsChangeRequested &&
        (toInsertChapters.length > 0 || toDeleteChapterIds.length > 0);

      // 5) 변경 없음 처리
      if (
        !nameChange &&
        !gradeChange &&
        !classChangeExists &&
        !chapterChangeExists
      ) {
        throw new BadRequestException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NO_CHANGE);
      }

      // 6) 교재 업데이트 (patch 있을 때만)
      if (Object.keys(patch).length > 0) {
        await textbookRepo.update(textbookId, patch);
      }

      // 7) classTextbook 변경 (동시성 안전)
      if (toDeleteClasses.length > 0) {
        await classTextbookRepo.delete({
          textbookId,
          classId: In(toDeleteClasses),
        });
      }
      // INSERT는 헬퍼 메서드 사용
      await this.insertClassTextbooksIgnore(
        manager,
        textbookId,
        toInsertClasses,
      );

      // 8) 챕터 변경 (벌크, 동시성 안전)
      if (unitsChangeRequested) {
        if (toDeleteChapterIds.length > 0) {
          await chapterRepo.delete({
            textbookChapterId: In(toDeleteChapterIds),
          });
        }
        // INSERT는 헬퍼 메서드 사용
        await this.insertChaptersIgnore(manager, toInsertChapters);
      }

      // 9) 로그
      await actionLogRepo.save({
        actorId: userIdOfAdmin,
        actorType: 'admin',
        action: 'UPDATE_TEXTBOOK',
        targetType: 'textbook',
        targetId: textbookId,
        description: `Admin updated textbook`,
        changes: {
          ...patch,
          ...(wantClassIds !== undefined
            ? {
                classDiff: {
                  toInsert: toInsertClasses,
                  toDelete: toDeleteClasses,
                },
              }
            : {}),
          ...(unitsChangeRequested
            ? {
                chapterDiff: {
                  toInsert: toInsertChapters.length,
                  toDelete: toDeleteChapterIds.length,
                  units,
                },
              }
            : {}),
        },
        createdAt: new Date(),
      });

      return;
    });
  }

  // 교재 삭제
  async deleteTextbook(textbookId: number, userIdOfAdmin: number) {
    const admin = await this.adminRepository.existsBy({
      userId: userIdOfAdmin,
    });
    if (!admin) {
      throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
    }

    return this.dataSource.transaction(async (manager) => {
      const textbookRepo = manager.getRepository(Textbook);
      const classTextbookRepo = manager.getRepository(ClassTextbook);
      const progressChapterRepo = manager.getRepository(ProgressChapter);
      const actionLogRepo = manager.getRepository(ActionLog);

      // 1. 교재 존재 확인
      const textbook = await textbookRepo.findOne({
        where: { textbookId, deletedAt: IsNull() },
      });
      if (!textbook) {
        throw new NotFoundException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NOT_FOUND);
      }

      // 2. 진도 기록이 있으면 삭제 금지
      const hasProgress = await progressChapterRepo
        .createQueryBuilder('pc')
        .innerJoin('pc.textbookChapter', 'tc')
        .where('tc.textbookId = :textbookId', { textbookId })
        .limit(1)
        .getOne();

      if (hasProgress) {
        throw new BadRequestException(
          MESSAGES.ADMIN.TEXTBOOK.ERROR.CANNOT_SHRINK_CHAPTER_WITH_PROGRESS,
        );
      }

      // 3. ClassTextbook 자동 해제 (진도 없으면 삭제 가능)
      await classTextbookRepo.delete({ textbookId });

      // 4. Textbook Soft Delete
      await textbookRepo.softDelete(textbookId);

      // 5. 로그 저장
      await actionLogRepo.save({
        actorId: userIdOfAdmin,
        actorType: 'admin',
        action: 'DELETE_TEXTBOOK',
        targetType: 'textbook',
        targetId: textbookId,
        description: `Admin soft deleted textbook (textbookId: ${textbookId})`,
        createdAt: new Date(),
      });
    });
  }

  /**
   * ClassTextbook을 중복 없이 안전하게 INSERT
   * - orIgnore로 UNIQUE 제약 위반 시 무시
   */
  private async insertClassTextbooksIgnore(
    manager: EntityManager,
    textbookId: number,
    classList: number[],
  ) {
    if (!classList?.length) return;

    const values = classList.map((classId) => ({
      classId,
      textbookId,
    }));

    await manager
      .createQueryBuilder()
      .insert()
      .into(ClassTextbook)
      .values(values)
      .orIgnore() // MySQL: INSERT IGNORE
      .execute();
  }

  /**
   * TextbookChapter를 중복 없이 안전하게 INSERT
   * - orIgnore로 UNIQUE 제약 위반 시 무시
   */
  private async insertChaptersIgnore(
    manager: EntityManager,
    chapters: Array<{
      textbookId: number;
      largeUnitNo: number;
      smallUnitNo: number;
    }>,
  ) {
    if (!chapters?.length) return;

    await manager
      .createQueryBuilder()
      .insert()
      .into(TextbookChapter)
      .values(chapters)
      .orIgnore() // MySQL: INSERT IGNORE
      .execute();
  }
}
