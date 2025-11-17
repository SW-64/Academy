import {
  BadRequestException,
  Injectable } from '@nestjs/common';
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
import { UpdateNoticeDto } from './dto/update-admin.dto';

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

  findOne(id: number) {
    return `This action returns a #${id} admin`;
  }

  update(id: number, updateAdminDto: UpdateAdminDto) {
    return `This action updates a #${id} admin`;
  }

  remove(id: number) {
    return `This action removes a #${id} admin`;
  }
}
