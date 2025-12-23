import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';

import { Role, User } from '../users/entities/user.entity';
import { Parent } from './entities/parent.entity';

import { MESSAGES } from '../constants/message.constant';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 자녀조회
  async getMyStudents(userId: number) {
    const parent = await this.parentRepository.findOne({
      where: { userId },
      relations: { student: { user: true } },
      select: {
        parentId: true,
        student: {
          studentId: true,
          school: true,
          grade: true,
          user: {
            userId: true,
            name: true,
          },
        },
      },
    });
    if (!parent) throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);

    return parent.student;
  }

  // 학부모 목록 조회
  async findAllParents(options?: IPaginationOptions, status?: string) {
    const where: FindOptionsWhere<User> = {
      role: Role.PARENT,
    };
    const allowed = new Set(['approved', 'pending']);
    if (status && !allowed.has(status)) {
      throw new BadRequestException(
        MESSAGES.ADMIN.PARENT.ERROR.LIST.INVALID_STATUS,
      );
    }
    if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'pending') {
      where.isApproved = false;
    }

    // paginate 사용
    return paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      where,
      select: {
        userId: true,
        email: true,
        name: true,
        isApproved: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  // 학부모 상세 조회
  async findOneParent(parentId: number) {
    const parent = await this.parentRepository.findOne({
      where: { parentId },
      relations: {
        user: true,
        student: {
          user: true,
        },
      },
      select: {
        parentId: true,
        user: { userId: true, name: true, email: true, isApproved: true },
        student: {
          studentId: true,
          userId: true,
          grade: true,
          school: true,
          createdAt: true,
          user: {
            name: true,
            phone: true,
          },
        },
      },
    });
    if (!parent) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    return parent;
  }
}
