import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';

import { Role, Status, User } from '../users/entities/user.entity';
import { Parent } from './entities/parent.entity';

import { MESSAGES } from '../constants/message.constant';
import { Student } from '../students/entities/student.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CACHE_KEYS } from '../constants/cache-keys.constant';
import { PaginatedResponse } from '../students/dto/students-search.response.dto';
import { ParentSearchResult } from './dto/parents-search.response.dto';
@Injectable()
export class ParentsService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(StudentClass)
    private readonly studentClassRepository: Repository<StudentClass>,
  ) {}

  // 자녀조회
  async getMyStudents(userId: number) {
    const parent = await this.parentRepository.findOne({
      where: { userId },
      select: { parentId: true },
    });
    if (!parent) throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);

    const rows = await this.studentRepository
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .select([
        's.studentId AS studentId',
        's.school AS school',
        's.grade AS grade',
        'u.userId AS userId',
        'u.name AS name',
      ])
      .where('s.parentId = :parentId', { parentId: parent.parentId })
      .orderBy('u.name', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      studentId: Number(r.studentId),
      school: r.school,
      grade: r.grade,
      user: { userId: Number(r.userId), name: r.name },
    }));
  }

  // 학부모 목록 조회
  async findAllParents(options?: IPaginationOptions) {
    const cacheKey = CACHE_KEYS.ADMIN_PARENTS_LIST_PAGE_1;
    const CACHE_TTL = 10 * 60 * 1000; // 10분
    const logger = new Logger('ParentsService:findAllParents');
    const isFirstPage = Number(options?.page ?? 1) === 1;

    if (isFirstPage) {
      try {
        const cached = await this.cache.get<any>(cacheKey);
        if (cached !== undefined && cached !== null) {
          return cached;
        }
      } catch (error) {
        logger.warn(`Cache GET failed: ${error.message}`, error.stack);
      }
    }

    const where: FindOptionsWhere<User> = {
      role: Role.PARENT,
      status: Status.approved,
    };

    // paginate 사용
    const parents = await paginate(this.userRepository, options, {
      order: { name: 'ASC' },
      relations: ['parent', 'parent.student', 'parent.student.user'],
      where,
      select: {
        userId: true,
        loginId: true,
        name: true,
        status: true,
        role: true,
        phone: true,
        createdAt: true,
        parent: {
          parentId: true,
          student: {
            studentId: true,
            user: {
              userId: true,
              name: true,
            },
          },
        },
      },
    });

    if (isFirstPage) {
      try {
        await this.cache.set(cacheKey, parents, CACHE_TTL);
      } catch (error) {
        logger.warn(`Cache SET failed: ${error.message}`, error.stack);
      }
    }

    return parents;
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
        user: {
          userId: true,
          name: true,
          loginId: true,
          phone: true,
          status: true,
        },
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
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }
    return parent;
  }

  // 자녀가 속한 클래스 조회 (부모)
  async getMyChildClasses(userId: number, studentId: number) {
    const parent = await this.parentRepository.findOne({
      where: { userId },
      select: { parentId: true },
    });
    if (!parent) {
      throw new NotFoundException(MESSAGES.PARENTS.ERROR.NOT_FOUND);
    }

    const student = await this.studentRepository.findOne({
      where: { parentId: parent.parentId, studentId },
      select: { studentId: true },
    });
    if (!student) {
      throw new NotFoundException(MESSAGES.PARENTS.STUDENT.ERROR.NOT_FOUND);
    }

    const rows = await this.studentClassRepository
      .createQueryBuilder('sc')
      .innerJoin('sc.clazz', 'c')
      .select(['c.classId AS classId', 'c.className AS className'])
      .where('sc.studentId = :studentId', { studentId: student.studentId })
      .getRawMany();

    return rows.map((r) => ({
      classId: Number(r.classId),
      className: r.className,
    }));
  }

  // 학부모 검색
  async searchParents(
    name: string,
    phone: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponse<ParentSearchResult>> {
    if (name && phone) {
      throw new BadRequestException(
        '이름과 전화번호는 동시에 검색할 수 없습니다.',
      );
    }
    if (!name && !phone) {
      throw new BadRequestException('이름 또는 전화번호를 입력해주세요.');
    }
    if (name && name.length < 2) {
      throw new BadRequestException('이름은 2글자 이상 입력해주세요.');
    }
    if (phone && phone.length < 4) {
      throw new BadRequestException('전화번호는 4자리 이상 입력해주세요.');
    }

    const baseCondition = (qb: SelectQueryBuilder<Parent>) => {
      qb.innerJoin('parent.user', 'user')
        .where('user.deleted_at IS NULL')
        .andWhere('parent.deleted_at IS NULL');

      if (name) qb.andWhere('user.name LIKE :name', { name: `%${name}%` });
      if (phone) qb.andWhere('user.phone LIKE :phone', { phone: `%${phone}%` });
    };

    // count 전용 쿼리
    const countQb = this.parentRepository.createQueryBuilder('parent');
    baseCondition(countQb);
    const total = await countQb.getCount();

    // data 쿼리
    const dataQb = this.parentRepository.createQueryBuilder('parent');
    baseCondition(dataQb);
    const raw = await dataQb
      .select([
        'user.user_id AS userId',
        'parent.parent_id AS parentId',
        'user.name AS name',
        'user.phone AS phone',
      ])
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<ParentSearchResult>();

    return {
      data: raw,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
