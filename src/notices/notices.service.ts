import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { MESSAGES } from '../constants/message.constant';

import { Notice } from './entities/notice.entity';
import { Admin } from '../admin/entities/admin.entity';

import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from '../notices/dto/update-notice.dto';
import { ActionLog } from './../action-logs/entities/action-logs.entity';

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
  ) {}

  //최신 글 계산 공통 유틸
  private static readonly NEW_DAYS = 3; //최근 3일
  private static readonly DATE_CALCULATION =
    NoticesService.NEW_DAYS * 24 * 60 * 60 * 1000; // Date.now()가 ms 단위이기 떄문에 (하루 = 24 x 60 x 60 x 1000 ms)
  //최신 글인 경우를 계산하여 isNew를 붙여서 반환
  private isNew<T extends Notice>(items: T[]) {
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
  ) {
    const admin = await this.adminRepository.findOneBy({ userId });
    if (!admin) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    const notice = await this.noticeRepository.save({
      title,
      content,
      pinned: pinned ?? false,
      adminId: admin.adminId,
    });

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: admin.userId,
      actorType: 'admin',
      action: 'CREATE_NOTICE',
      targetType: 'notice',
      targetId: notice.noticeId,
      description: `Admin created a notice (noticeId: ${notice.noticeId})`,
      createdAt: new Date(),
    });
    return notice;
  }

  // 공지사항 전체 조회
  async findAllNotices(
    options?: IPaginationOptions,
  ): Promise<Pagination<Notice & { isNew: boolean }>> {
    const notices = await paginate(this.noticeRepository, options, {
      order: { createdAt: 'DESC' },
    });
    const noticesWithNew = this.isNew(notices.items);
    return { ...notices, items: noticesWithNew };
  }

  // 공지사항 상세 조회
  async findNotice(noticeId: number) {
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);
    }
    return this.isNew([existedNotice])[0];
  }

  // 고정 공지사항 조회
  async findPinnedNotices(): Promise<(Notice & { isNew: boolean })[]> {
    const pinnedNotices = await this.noticeRepository.find({
      where: { pinned: true },
      order: { createdAt: 'DESC' },
    });
    return this.isNew(pinnedNotices);
  }

  // 공지사항 수정
  async updateNotice(
    noticeId: number,
    { title, content, pinned }: UpdateNoticeDto,
    adminId: number,
  ) {
    //1. 해당 공지사항이 존재하는지 검증
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);
    }
    //2. 변경된 내용이 있는지 체크
    const titleChange = title !== undefined && existedNotice.title !== title;
    const contentChange =
      content !== undefined && existedNotice.content !== content;
    const pinnedChange =
      pinned !== undefined && existedNotice.pinned !== pinned;

    if (!titleChange && !contentChange && !pinnedChange) {
      throw new BadRequestException(
        MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.NO_CHANGES,
      );
    }
    //3. undefined 제외하고 업데이트
    const patch: Partial<Notice> = {}; // 수정된 내용 담을 객체 만들기
    if (title !== undefined) patch.title = title; // title이 비어있으면 업데이트 대상이 아니기 때문에 건너뜀
    if (content !== undefined) patch.content = content;
    if (pinned !== undefined) patch.pinned = pinned;

    const result = await this.noticeRepository.update({ noticeId }, patch); // 업데이트 쿼리만 실행
    if (result.affected === 0)
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: adminId,
      actorType: 'admin',
      action: 'UPDATE_NOTICE',
      targetType: 'notice',
      targetId: noticeId,
      description: `Admin updated a notice (noticeId: ${noticeId})`,
      changes: patch,
      createdAt: new Date(),
    });
    return;
  }

  // 공지사항 삭제
  async deleteNotice(noticeId: number, adminId: number) {
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(MESSAGES.ADMIN.NOTICE.ERROR.NOT_FOUND);
    }
    await this.noticeRepository.softDelete(noticeId);
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
