import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { Grade } from './entities/grade.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Repository } from 'typeorm';
import { MESSAGES } from '../constants/message.constant';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(Grade)
    private readonly gradesRepository: Repository<Grade>,
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
      throw new NotFoundException(MESSAGES.GRADE.NOT_EXIST);
    }
    const grade = await this.gradesRepository.findOne({
      where: { studentId: studentId, gradeId: gradeId },
      relations: ['exam'],
    });
    return grade;
  }
}
