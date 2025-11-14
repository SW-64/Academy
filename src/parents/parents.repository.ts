import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { Repository } from 'typeorm';
import { Student } from '../students/entities/student.entity';

@Injectable()
export class ParentsRepository {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async findByUserId(userId: number) {
    const parent = await this.parentRepository.findOne({
      where: { userId },
      select: ['parentId'],
    });
    return parent ? parent.parentId : null;
  }

  async findMyStudents(parentId: any) {
    const myStudents = await this.studentRepository.find({
      where: { parentId },
      relations: ['user'],
      select: {
        studentId: true,
        user: {
          userId: true,
          name: true,
          email: true,
        },
      },
    });
    return myStudents;
  }
}
