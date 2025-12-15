import { Injectable, NotFoundException } from '@nestjs/common';
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

  async getMyStudents(userId: number) {
    const { parentId } = await this.parentRepository.findOneBy({
      userId,
    });
    const students = await this.parentRepository.find({
      where: { parentId },
      relations: ['user', 'student'],
      select: {
        student: {
          studentId: true,
        },
        user: {
          userId: true,
          name: true,
          email: true,
        },
      },
    });

    return students;
  }

  // 학부모 목록 조회
  async findAllParents(options?: IPaginationOptions, status?: string) {
    const where: FindOptionsWhere<User> = {
      role: Role.PARENT,
    };

    if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'pending') {
      where.isApproved = false;
    }

    // paginate 사용
    return paginate(this.userRepository, options, {
      order: { createdAt: 'DESC' },
      where,
    });
  }

  // 학부모 상세 조회
  async findOneParent(parentId: number) {
    const parent = await this.parentRepository.findOneBy({
      parentId: parentId,
    });
    if (!parent) {
      throw new NotFoundException(MESSAGES.USER.ERROR.NOT_FOUND);
    }
    return parent;
  }
}
