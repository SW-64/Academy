import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
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
}
