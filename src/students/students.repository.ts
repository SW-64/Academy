import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Repository } from 'typeorm';
import { Grade } from 'src/grades/entities/grade.entity';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';

@Injectable()
export class StudentsRepository {
  constructor(
    @InjectRepository(Student)
    private readonly repository: Repository<Student>,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
  ) {}

  //성적 목록 조회(페이징)
  async findGrade(studentId: number, options?: IPaginationOptions) {
    return paginate(this.gradeRepository, options, {
      where: { student_id: studentId },
      relations: ['exam'],
      order: { grade_id: 'ASC' },
      select: {
        grade_id: true,
        exam_id: true,
        student_id: true,
        subject: true,
        score: true,
        exam: {
          year: true,
          semester: true,
          type: true,
          exam_date: true,
        },
      },
    });
  }

  //성적 상세 조회
  async findGradeDetail(studentId: number, gradeId: number) {
    const grade = await this.gradeRepository.findOne({
      where: { student_id: studentId, grade_id: gradeId },
      relations: ['exam'],
    });
    return grade;
  }
}
