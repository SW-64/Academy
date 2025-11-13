import { Injectable } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsRepository } from './students.repository';
import { IPaginationOptions, Pagination } from 'nestjs-typeorm-paginate';
import { Grade } from 'src/grades/entities/grade.entity';

@Injectable()
export class StudentsService {
  constructor(private readonly studentsRepository: StudentsRepository) {}

  async findGarde(
    studentId: number,
    options?: IPaginationOptions,
  ): Promise<Pagination<Grade>> {
    return await this.studentsRepository.findGrade(studentId, options);
  }

  async findGardeDetail(studentId: number, gradeId: number): Promise<Grade> {
    const grade = await this.studentsRepository.findGradeDetail(
      studentId,
      gradeId,
    );
    return grade;
  }

  create(createStudentDto: CreateStudentDto) {
    return 'This action adds a new student';
  }

  findAll() {
    return `This action returns all students`;
  }

  findOne(id: number) {
    return `This action returns a #${id} student`;
  }

  update(id: number, updateStudentDto: UpdateStudentDto) {
    return `This action updates a #${id} student`;
  }

  remove(id: number) {
    return `This action removes a #${id} student`;
  }
}
