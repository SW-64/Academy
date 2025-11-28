import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { Grade } from '../admin/entities/grade.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Repository } from 'typeorm';
import { RedisClient } from './../redis/redis.client';
import { MESSAGES } from './../constants/message.constant';
import { Parent } from './../parents/entities/parent.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(Grade)
    private readonly gradesRepository: Repository<Grade>,
    @InjectRepository(Parent)
    private readonly parentsRepository: Repository<Parent>,
    private readonly redisClient: RedisClient,
  ) {}

  //성적 목록 조회(페이징)
  async getGardes(
    studentId: number,
    options?: IPaginationOptions,
  ): Promise<Pagination<Grade>> {
    return await paginate(this.gradesRepository, options, {
      where: { studentId: studentId },
      relations: ['exam'],
      order: { gradeId: 'ASC' },
      select: {
        gradeId: true,
        examId: true,
        studentId: true,
        subject: true,
        score: true,
        exam: {
          year: true,
          semester: true,
          exam_date: true,
        },
      },
    });
  }

  //성적 상세 조회
  async getGardeDetail(studentId: number, gradeId: number): Promise<Grade> {
    const existGrade = await this.gradesRepository.findOneBy({ gradeId });
    if (!existGrade) {
      throw new NotFoundException(MESSAGES.ADMIN.GRADE.NOT_EXISTED);
    }
    const grade = await this.gradesRepository.findOne({
      where: { studentId: studentId, gradeId: gradeId },
      relations: ['exam'],
    });
    return grade;
  }

  // 부모 연동 연결
  async linkParentByCode(code: string, userId: number) {
    // 1. Redis에서 코드로 부모ID 조회
    const parentData = await this.getParentByCode(code);
    if (!parentData || !parentData.parentId) {
      throw new NotFoundException(MESSAGES.STUDENT.PARENT_LINK.INVALID_CODE);
    }
    const parentId = parentData.parentId;

    // 2. 부모 ID로 부모 엔티티 조회
    const parent = await this.parentsRepository.findOneBy({
      parentId: parentId,
    });
    if (!parent) {
      throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
    }

    // 3. 학생 부모 연동
    await this.studentsRepository.update(
      { userId: userId },
      { parentId: parentId },
    );

    return;
  }

  // Redis에서 링크 코드로 부모ID 조회
  async getParentByCode(code: string) {
    return this.redisClient.getJson<{ parentId: number }>(`link:code:${code}`);
  }

  // 부모 연동 해제
  async unlinkParentById(parentId: number, userId: number) {
    // 학생의 부모ID와 일치하는지 확인
    const student = await this.studentsRepository.findOneBy({ userId: userId });
    if (!student || student.parentId !== parentId) {
      throw new NotFoundException(MESSAGES.STUDENT.NOT_EXISTED);
    }

    // 부모 연동 해제
    await this.studentsRepository.update(
      { userId: userId },
      { parentId: null },
    );

    return;
  }
}
