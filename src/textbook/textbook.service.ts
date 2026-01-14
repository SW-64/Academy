import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Textbook } from './entities/textbook.entity';
import { DataSource, In, Repository } from 'typeorm';
import { CreateTextbookDto } from './dto/create-textbook.dto';
import { Admin } from './../admin/entities/admin.entity';
import { MESSAGES } from '../constants/message.constant';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { TextbookChapter } from './entities/textbook-chapter.entity';
import { UpdateTextbookDto } from './dto/update-textbook.dto';
import { ClassTextbook } from '../class-textbook/entities/class-textbook.entity';
import { Class } from './../class/entities/class.entity';

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
    { name, grade, largeUnit, smallUnit, classList }: CreateTextbookDto,
    adminId: number,
  ) {
    const admin = await this.adminRepository.findOneBy({ userId: adminId });
    if (!admin) {
      throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
    }
    if (largeUnit < 1 || smallUnit < 1) {
      throw new BadRequestException('largeUnit/smallUnit must be >= 1');
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
        largeUnit,
        smallUnit,
      });

      // 2) 단원 조합 생성 (L*S)
      //    largeUnit=3, smallUnit=3 => (1,1)~(3,3)
      const chapters = Array.from({ length: largeUnit }, (_, li) =>
        Array.from({ length: smallUnit }, (_, si) => ({
          textbookId: textbook.textbookId,
          largeUnitNo: li + 1,
          smallUnitNo: si + 1,
        })),
      ).flat();

      // 3) 벌크 INSERT (save 대신 insert)
      // insert()는 엔티티 라이프사이클 훅이 필요 없고, 불필요한 조회가 없어서 더 가볍
      await chapterRepo.insert(chapters);

      // 4) 교재 - 반 테이블 벌크 INSERT
      if (classList && classList.length > 0) {
        const classTextbooks = classList.map((classId) => ({
          classId,
          textbookId: textbook.textbookId,
        }));
        await classTextbookRepo.insert(classTextbooks);
      }

      // 5) 로그 저장
      await logRepo.insert({
        actorId: admin.userId,
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
    const textbooks = await this.textbookRepository.find();
    return textbooks;
  }

  // 교재 상세 조회
  async getTextbookById(textbookId: number) {
    const textbook = await this.textbookRepository.findOne({
      where: { textbookId },
      relations: ['classTextbooks', 'classTextbooks.clazz'],
      select: {
        textbookId: true,
        name: true,
        grade: true,
        largeUnit: true,
        smallUnit: true,
        classTextbooks: {
          classTextbookId: true,
          clazz: {
            classId: true,
            className: true,
          },
        },
      },
    });

    if (!textbook) {
      throw new NotFoundException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NOT_FOUND);
    }
    return textbook;
  }

  // 교재 수정
  async updateTextbook(
    dto: UpdateTextbookDto,
    adminId: number,
    textbookId: number,
  ) {
    const { name, grade, classList } = dto;

    return this.dataSource.transaction(async (manager) => {
      const textbookRepo = manager.getRepository(Textbook);
      const classTextbookRepo = manager.getRepository(ClassTextbook);
      const classRepo = manager.getRepository(Class);

      // 1) 교재 확인
      const textbook = await textbookRepo.findOne({ where: { textbookId } });
      if (!textbook) {
        throw new NotFoundException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NOT_FOUND);
      }

      // 2) patch 계산
      const patch: Partial<Textbook> = {};
      const nameChange =
        typeof name === 'string' &&
        name.trim() !== '' &&
        name !== textbook.name;
      const gradeChange = typeof grade === 'number' && grade !== textbook.grade;

      if (nameChange) patch.name = name;
      if (gradeChange) patch.grade = grade;

      // 3) classList 정규화(중복 제거) - DTO에 ArrayUnique가 있어도 방어적으로 한번 더
      const wantClassIds = Array.isArray(classList)
        ? Array.from(new Set(classList))
        : undefined;

      // 4) classList diff
      let toDelete: number[] = [];
      let toInsert: number[] = [];

      if (wantClassIds !== undefined) {
        // 4-1) classId 유효성 검증 (존재 체크)
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

        // 4-2) 현재 연결 조회 (활성만 존재하므로 deletedAt 조건 없음)
        const existingLinks = await classTextbookRepo.find({
          select: { classId: true },
          where: { textbookId },
        });
        const existingSet = new Set(existingLinks.map((l) => l.classId));
        const wantSet = new Set(wantClassIds);

        toDelete = Array.from(existingSet).filter((id) => !wantSet.has(id));
        toInsert = wantClassIds.filter((id) => !existingSet.has(id));
      }

      const classChangeExists =
        wantClassIds !== undefined &&
        (toDelete.length > 0 || toInsert.length > 0);

      // 5) 변경 없음 처리
      if (!nameChange && !gradeChange && !classChangeExists) {
        throw new BadRequestException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NO_CHANGE);
      }

      // 6) 교재 업데이트 (patch 있을 때만)
      if (Object.keys(patch).length > 0) {
        await textbookRepo.update(textbookId, patch);
      }

      // 7) 연결 테이블 변경 (벌크)
      if (toDelete.length > 0) {
        await classTextbookRepo.delete({
          textbookId,
          classId: In(toDelete),
        });
      }

      if (toInsert.length > 0) {
        // 유니크 제약 (classId, textbookId) 가 있으면 중복 insert를 DB가 방어
        // 동시성 대비: insert 전에 이미 들어간 경우를 무시하려면 upsert 고려 가능
        const rows = toInsert.map((classId) => ({ classId, textbookId }));
        await classTextbookRepo.insert(rows);
      }

      // 8) 로그 (변경 내역을 더 실무적으로 남김)
      await this.actionLogRepository.save({
        actorId: adminId,
        actorType: 'admin',
        action: 'UPDATE_TEXTBOOK',
        targetType: 'textbook',
        targetId: textbookId,
        description: `Admin updated textbook`,
        changes: {
          ...patch,
          ...(wantClassIds !== undefined
            ? { classDiff: { toInsert, toDelete } }
            : {}),
        },
        createdAt: new Date(),
      });

      return;
    });
  }

  // 교재 삭제
  async deleteTextbook(textbookId: number, adminId: number) {
    const admin = await this.adminRepository.findOneBy({ userId: adminId });
    if (!admin) {
      throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
    }

    const textbook = await this.textbookRepository.findOneBy({ textbookId });
    if (!textbook) {
      throw new NotFoundException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NOT_FOUND);
    }

    await this.textbookRepository.softDelete(textbookId);

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: admin.userId,
      actorType: 'admin',
      action: 'DELETE_TEXTBOOK',
      targetType: 'textbook',
      targetId: textbookId,
      description: `Admin deleted a textbook (textbookId: ${textbookId})`,
      createdAt: new Date(),
    });
  }
}
