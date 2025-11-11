import { Injectable } from '@nestjs/common';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ParentsRepository } from './parents.repository';

@Injectable()
export class ParentsService {
  constructor(private readonly parentRepository: ParentsRepository) {}

  create(createParentDto: CreateParentDto) {
    return 'This action adds a new parent';
  }
  async getParentIdByUserId(userId: number) {
    const parentId = await this.parentRepository.findByUserId(userId);

    return parentId;
  }

  async findMyStudents(parentId: number) {
    const students = await this.parentRepository.findMyStudents(parentId);
    return students;
  }

  findAll() {
    return `This action returns all parents`;
  }

  findOne(id: number) {
    return `This action returns a #${id} parent`;
  }

  update(id: number, updateParentDto: UpdateParentDto) {
    return `This action updates a #${id} parent`;
  }

  remove(id: number) {
    return `This action removes a #${id} parent`;
  }
}
