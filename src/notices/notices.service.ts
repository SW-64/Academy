import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
    userId: number,
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
          userId,
        },
        select: {
          adminId: true,
          userId: true,
        },
      });
      if (!admin) {
        throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
      }
      const existedClass = await classRepo.existsBy({
        classId,
      });
      if (!existedClass) {
        throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
      }

      // 공지 생성
      const notice = await noticeRepo.save({
        title,
        content,
        adminId: admin.adminId,
      });

      // 반-공지 생성
      await classNoticeRepo.save({
        classId,
        noticeId: notice.noticeId,
        pinned: pinned ?? false,
      });

      // 로그 저장
      await actionLogRepo.save({
        actorId: admin.userId,
        actorType: 'admin',
        action: 'CREATE_NOTICE',
        targetType: 'notice',
        targetId: notice.noticeId,
        description: `Admin created a notice (noticeId: ${notice.noticeId})`,
        createdAt: new Date(),
      });

      return notice.noticeId;
    });
  }

  // 공지사항 전체 조회
  async findAllNotices(
    classId: number,
    options: IPaginationOptions,
  ): Promise<Pagination<Notice & { isNew: any }>> {
    const qb = this.noticeRepository
      .createQueryBuilder('n')
      .innerJoin(
        ClassNotice,
        'cn',
        'cn.notice_id = n.notice_id AND cn.class_id = :classId',
        { classId },
      )
      // 정렬: pinned 우선, 최신순
      .orderBy('n.pinned', 'DESC')
      .addOrderBy('n.created_at', 'DESC')
      // 필요한 컬럼만
      .select([
        'n.noticeId',
        'n.title',
        'n.content',
        'n.pinned',
        'n.createdAt',
        'n.updatedAt',
        'n.adminId',
      ]);

    // paginate는 QueryBuilder도 지원
    const paged = await paginate<Notice>(qb, options);

    // isNew 계산(기존 유틸 재사용 가능하게 형태 맞춤)
    const items = this.noticeOne(paged.items as Notice[]).map((x) => ({
      noticeId: x.noticeId,
      title: x.title,
      content: x.content,
      pinned: x.pinned,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
      adminId: x.adminId,
      isNew: (x as any).isNew,
    }));

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
