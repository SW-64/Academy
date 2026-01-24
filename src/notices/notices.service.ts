import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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

import { Notice } from './entities/notice.entity';

import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from '../notices/dto/update-notice.dto';
import { ActionLog } from './../action-logs/entities/action-logs.entity';
import { Admin } from './../admin/entities/admin.entity';
import { ClassNotice } from './entities/class-notice.entity';
import { Class } from './../class/entities/class.entity';
import { Type } from 'class-transformer';
import { NoticeListItem } from './dto/find-all-notices.return.dto';

@Injectable()
export class NoticesService {
  constructor(
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
  private noticeList<T extends ClassNotice>(items: T[]) {
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
    return this.dataSource.transaction(async (manager) => {
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

      // 2) 반-공지 INSERT
      await classNoticeRepo.insert({
        classId,
        noticeId,
        pinned: pinned ?? false,
      });

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
  }

  // 공지사항 전체 조회
  async findAllNotices(
    classId: number,
    options: IPaginationOptions,
  ): Promise<Pagination<NoticeListItem>> {
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

    return { ...paged, items };
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
    return await this.dataSource.transaction(async (manager) => {
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

      if (pinnedChange && pinned) {
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
      return;
    });
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
    return;
  }
}
