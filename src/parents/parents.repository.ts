import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ParentsRepository {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
  ) {}

  async findByUserId(userId: number) {
    const parent = await this.parentRepository.findOne({
      where: { user_id: userId },
      select: ['parent_id'],
    });
    return parent ? parent.parent_id : null;
  }

  async findMyStudents(parentId: any) {
    const myStudents = await this.studentRepository.find({
      where: { parent_id: parentId },
      relations: ['users'],
      select: {
        student_id: true,
        user: {
          user_id: true,
          name: true,
          email: true,
        },
      },
    });
    return myStudents;
  }
}
