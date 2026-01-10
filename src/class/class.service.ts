import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { Repository } from 'typeorm';
import { MESSAGES } from '../constants/message.constant';
import { ClassTextbook } from './../class-textbook/entities/class-textbook.entity';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassTextbook)
    private readonly classTextbookRepository: Repository<ClassTextbook>,
  ) {}

  // 클래스의 교재 목록 조회
  async getAllTextbooksOfClass(classId: number) {
    const existedClass = await this.classRepository.findOneBy({ classId });
    if (!existedClass) {
      throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
    }

    const textbooks = await this.classTextbookRepository.find({
      where: { classId },
      relations: ['textbook', 'class_textbook'],
      select: {
        textbook: {
          textbookId: true,
          name: true,
          grade: true,
          largeUnit: true,
          smallUnit: true,
        },
      },
    });
    return textbooks;
  }
}
