import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';

import { MESSAGES } from '../constants/message.constant';
import { cacheKey } from './../constants/cache-keys.constant';

import { NoticeListItem } from './dto/find-all-notices.return.dto';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from '../notices/dto/update-notice.dto';

import { Notice } from './entities/notice.entity';
import { ActionLog } from './../action-logs/entities/action-logs.entity';
import { Admin } from './../admin/entities/admin.entity';
import { ClassNotice } from './entities/class-notice.entity';
import { Class } from './../class/entities/class.entity';

import { CacheService } from '../cache/cache.service';
@Injectable()
export class NoticesService {
  constructor(
    private readonly cache: CacheService,
    private readonly dataSource: DataSource,
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
    @InjectRepository(ClassNotice)
    private readonly classNoticeRepository: Repository<ClassNotice>,
  ) {}

  //최신 글 계산 공통 유틸
  private static readonly NEW_DAYS = 3; //최근 3일
  private static readonly DATE_CALCULATION =
    NoticesService.NEW_DAYS * 24 * 60 * 60 * 1000; // Date.now()가 ms 단위이기 떄문에 (하루 = 24 x 60 x 60 x 1000 ms)
  //최신 글인 경우를 계산하여 isNew를 붙여서 반환
  private noticeOne<T extends Notice>(items: T[]) {
    const now = Date.now();
    return items.map((n) => ({
      ...n,
      isNew: now - n.createdAt.getTime() <= NoticesService.DATE_CALCULATION,
    }));
  }

  // 공지사항 생성
  async createNotice(
    userIdOfAdmin: number,
    { title, content, pinned }: CreateNoticeDto,
    classId: number,
  ) {
    const noticeId = await this.dataSource.transaction(async (manager) => {
      const actionLogRepo = manager.getRepository(ActionLog);
      const adminRepo = manager.getRepository(Admin);
      const noticeRepo = manager.getRepository(Notice);
      const classNoticeRepo = manager.getRepository(ClassNotice);
      const classRepo = manager.getRepository(Class);

      const admin = await adminRepo.findOne({
        where: {
          userId: userIdOfAdmin,
        },
        select: {
          adminId: true,
          userId: true,
        },
      });
      if (!admin) {
        throw new UnauthorizedException(MESSAGES.AUTH.ERROR.UNAUTHORIZED);
      }
      const existedClass = await classRepo.existsBy({
        classId,
        deletedAt: IsNull(),
      });
      if (!existedClass) {
        throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
      }

      // 공지 생성
      const noticeInsertResult = await noticeRepo.insert({
        title,
        content,
        adminId: admin.adminId,
      });

      // insert 결과에서 PK 꺼내기
      // MySQL 기준: identifiers[0].noticeId 형태로 들어오는 경우가 많음
      const noticeIdRaw =
        noticeInsertResult.identifiers?.[0]?.noticeId ??
        noticeInsertResult.generatedMaps?.[0]?.noticeId;

      const noticeId = Number(noticeIdRaw);
      if (!Number.isInteger(noticeId) || noticeId <= 0) {
        throw new InternalServerErrorException(
          MESSAGES.COMMON.ERROR.INTERNAL_SERVER_ERROR,
        );
      }

      // 2) 반-공지 INSERT (orIgnore로 중복 방지)
      await classNoticeRepo
        .createQueryBuilder()
        .insert()
        .into(ClassNotice)
        .values({
          classId,
          noticeId,
          pinned: pinned ?? false,
        })
        .orIgnore() // ← 추가
        .execute();

      // 로그 저장
      await actionLogRepo.insert({
        actorId: userIdOfAdmin,
        actorType: 'admin',
        action: 'CREATE_NOTICE',
        targetType: 'notice',
        targetId: noticeId,
        description: `Admin created a notice (noticeId: ${noticeId})`,
        createdAt: new Date(),
      });
      return noticeId;
    });
    await this.invalidateNoticeCache(classId); // 캐시 무효화
    return noticeId;
  }

  // 공지사항 전체 조회
  async findAllNotices(
    classId: number,
    options: IPaginationOptions,
  ): Promise<Pagination<NoticeListItem>> {
    const logger = new Logger('NoticesService:findAllNotices');
    const CACHE_TTL = 10 * 60 * 1000; // 10분 (ms)

    // 1) page=1일 때만 캐시 사용 (그 외 페이지는 DB로)
    const page = Number(options.page ?? 1);
    const isFirstPage = page === 1;

    // 2) 캐시 HIT 시 바로 반환
    let listCacheKey: string | null = null;

    if (isFirstPage) {
      // 2-1) 버전키 조회 (없으면 1로 간주)
      const verKey = cacheKey.adminClassNoticesVer(classId);
      let ver = 1;

      try {
        const cachedVer = await this.cache.get<number>(verKey);
        if (cachedVer !== undefined && cachedVer !== null) {
          ver = cachedVer;
        } else {
          await this.cache.set(verKey, ver, 24 * 60 * 60 * 1000); // 1일
        }
      } catch (error: any) {
        logger.warn(
          `Cache GET/SET ver failed: ${error?.message}`,
          error?.stack,
        );
      }

      // 2-2) 목록 캐시 키 생성 (page=1 고정)
      listCacheKey = cacheKey.adminClassNoticesListPage1(classId, ver);

      try {
        const hit =
          await this.cache.get<Pagination<NoticeListItem>>(listCacheKey);
        if (hit !== undefined && hit !== null) {
          return hit;
        }
      } catch (error: any) {
        logger.warn(`Cache GET list failed: ${error?.message}`, error?.stack);
      }
    }
    const qb = this.noticeRepository
      .createQueryBuilder('n')
      .innerJoinAndSelect('n.classNotices', 'cn', 'cn.class_id = :classId', {
        classId,
      })
      .orderBy('cn.pinned', 'DESC')
      .addOrderBy('cn.createdAt', 'DESC')
      .select([
        'n.noticeId',
        'n.title',
        'n.createdAt',
        'n.updatedAt',
        'cn.classNoticeId',
        'cn.pinned',
        'cn.createdAt',
      ]);

    const paged = await paginate<Notice>(qb, options);
    const now = Date.now();

    const items = paged.items.map((n: Notice) => {
      const cn = n.classNotices?.[0];

      return {
        noticeId: n.noticeId,
        title: n.title,
        pinned: cn?.pinned ?? false,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        isNew: cn
          ? now - cn.createdAt.getTime() <= NoticesService.DATE_CALCULATION
          : false,
      };
    });

    const result: Pagination<NoticeListItem> = { ...paged, items };

    // page=1만 캐시에 저장
    if (isFirstPage && listCacheKey) {
      try {
        await this.cache.set(listCacheKey, result, CACHE_TTL);
      } catch (error: any) {
        logger.warn(`Cache SET list failed: ${error?.message}`, error?.stack);
      }
    }

    return result;
  }

  // 공지사항 상세 조회
  async findNotice(noticeId: number, classId: number) {
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);
    }

    const isNoticeInClass = await this.classNoticeRepository.existsBy({
      noticeId,
      classId,
    });
    if (!isNoticeInClass) {
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);
    }
    return this.noticeOne([existedNotice])[0];
  }

  // 고정 공지사항 조회
  async findPinnedNotices(
    classId: number,
  ): Promise<(Notice & { isNew: boolean })[]> {
    const pinnedNotices = await this.noticeRepository.find({
      where: {
        classNotices: {
          classId,
        },
      },
      order: { createdAt: 'DESC' },
    });
    return this.noticeOne(pinnedNotices);
  }

  // 공지사항 수정
  async updateNotice(
    noticeId: number,
    { title, content, pinned }: UpdateNoticeDto,
    adminId: number,
    classId: number,
  ) {
    //1. 해당 공지사항이 존재하는지 검증
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);
    }
    const existedClassNotice = await this.classNoticeRepository.findOne({
      where: {
        noticeId,
        classId,
      },
      select: {
        pinned: true,
      },
    });
    if (!existedClassNotice) {
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);
    }
    //2. 변경된 내용이 있는지 체크
    const titleChange = title !== undefined && existedNotice.title !== title;
    const contentChange =
      content !== undefined && existedNotice.content !== content;
    const pinnedChange =
      pinned !== undefined && existedClassNotice.pinned !== pinned;

    if (!titleChange && !contentChange && !pinnedChange) {
      throw new BadRequestException(
        MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.NO_CHANGES,
      );
    }
    //3. undefined 제외하고 업데이트
    await this.dataSource.transaction(async (manager) => {
      const noticeRepo = manager.getRepository(Notice);
      const classNoticeRepo = manager.getRepository(ClassNotice);
      const actionLogRepo = manager.getRepository(ActionLog);

      const noticePatch: Partial<Notice> = {}; // 수정된 내용 담을 객체 만들기
      if (title) noticePatch.title = title;
      if (content) noticePatch.content = content;

      if (Object.keys(noticePatch).length > 0) {
        const r = await noticeRepo.update({ noticeId }, noticePatch);
        if (r.affected === 0)
          throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NO_CHANGES);
      }

      if (pinnedChange) {
        const result = await classNoticeRepo.update(
          { noticeId, classId },
          { pinned },
        ); // 업데이트 쿼리만 실행
        if (result.affected === 0)
          throw new BadRequestException(MESSAGES.ADMIN.NOTICE.ERROR.NO_CHANGES);
      }

      // 로그 저장
      await actionLogRepo.save({
        actorId: adminId,
        actorType: 'admin',
        action: 'UPDATE_NOTICE',
        targetType: 'notice',
        targetId: noticeId,
        description: `Admin updated a notice (noticeId: ${noticeId})`,
        changes: { noticePatch, pinned },
        createdAt: new Date(),
      });
    });
    await this.invalidateNoticeCache(classId);
    return;
  }

  // 공지사항 삭제
  async deleteNotice(noticeId: number, adminId: number, classId: number) {
    const existedNotice = await this.noticeRepository.existsBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);
    }
    const existedClassNotice = await this.classNoticeRepository.findOneBy({
      noticeId,
      classId,
    });
    if (!existedClassNotice) {
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);
    }
    await this.noticeRepository.delete(noticeId);
    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'DELETE_NOTICE',
      targetType: 'notice',
      targetId: noticeId,
      description: `Admin deleted a notice (noticeId: ${noticeId})`,
      createdAt: new Date(),
    });
    await this.invalidateNoticeCache(classId);
    return;
  }

  /**
   * 공지사항 캐시 무효화 (버전 증가)
   */
  private async invalidateNoticeCache(classId: number): Promise<void> {
    const logger = new Logger('NoticesService:invalidateNoticeCache');

    try {
      const verKey = cacheKey.adminClassNoticesVer(classId);
      const currentVer = await this.cache.get<number>(verKey);
      const ver = currentVer ?? 1;

      await this.cache.set(verKey, ver + 1, 24 * 60 * 60 * 1000);
    } catch (error: any) {
      logger.warn(
        `Failed to invalidate notice cache for classId=${classId}: ${error?.message}`,
        error?.stack,
      );
    }
  }
}
