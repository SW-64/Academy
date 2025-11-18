import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Notice } from './entities/notice.entity';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { MESSAGES } from '../constants/message.constant';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { UpdateNoticeDto } from './dto/update-notice.dto';

@Injectable()
export class AdminService {
  @InjectRepository(Notice)
  private readonly noticeRepository: Repository<Notice>;
  @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>;

  // 공지사항 생성
  async createNotice(userId: number, { title, content }: CreateNoticeDto) {
    const adminConfirmed = await this.adminRepository.findOneBy({
      userId,
    });
    if (!adminConfirmed) {
      throw new BadRequestException(MESSAGES.ADMIN.NOTICE.UNAUTHORIZED.CREATED);
    }
    const notice = this.noticeRepository.save({
      title,
      content,
    });
    return notice;
  }

  // 공지사항 전체 조회
  async findAllNotices(
    options?: IPaginationOptions,
  ): Promise<Pagination<Notice>> {
    const notices = await paginate(this.noticeRepository, options, {
      order: { createdAt: 'DESC' },
    });
    return notices;
  }

  // 공지사항 상세 조회
  async findNotice(noticeId: number) {
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(
        MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.NOT_EXISTED,
      );
    }
    return existedNotice;
  }

  // 공지사항 수정
  async updateNotice(
    userId: number,
    noticeId: number,
    { title, content }: UpdateNoticeDto,
  ) {
    //유효성 검증
    //1. 어드민 자격 검증
    const adminConfirmed = await this.adminRepository.findOneBy({ userId });
    if (!adminConfirmed) {
      throw new BadRequestException(MESSAGES.ADMIN.NOTICE.UNAUTHORIZED.UPDATED);
    }
    //2. 해당 공지사항이 존재하는지 검증
    const existedNotice = await this.noticeRepository.findOneBy({ noticeId });
    if (!existedNotice) {
      throw new NotFoundException(
        MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.NOT_EXISTED,
      );
    }
    //3. 변경된 내용이 없을 경우
    const sameNotice =
      existedNotice.title === title && existedNotice.content === content;
    if (sameNotice) {
      throw new BadRequestException(MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.SAME);
    }

    const updateNotice = await this.noticeRepository.update(
      { noticeId },
      { title, content },
    );

    return updateNotice;
  }
}
