import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Textbook } from './entities/textbook.entity';
import { Repository } from 'typeorm';
import { CreateTextbookDto } from './dto/create-textbook.dto';
import { Admin } from './../admin/entities/admin.entity';
import { MESSAGES } from '../constants/message.constant';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { TextbookChapter } from './entities/textbook-chapter.entity';

@Injectable()
export class TextbookService {
  constructor(
    @InjectRepository(Textbook)
    private readonly textbookRepository: Repository<Textbook>,
    @InjectRepository(TextbookChapter)
    private readonly textbookChapterRepository: Repository<TextbookChapter>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
  ) {}

  // 교재 생성
  async createTextbook(
    { name, grade, largeUnit, smallUnit }: CreateTextbookDto,
    adminId: number,
  ) {
    const admin = await this.adminRepository.findOneBy({ userId: adminId });
    if (!admin) {
      throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
    }
    // 교재 생성
    const textbook = await this.textbookRepository.save({
      name,
      grade,
      largeUnit,
      smallUnit,
    });
    // 교재 단원 생성
    await this.textbookChapterRepository.save(
      Array.from({ length: largeUnit }, (_, i) => ({
        textbookId: textbook.textbookId,
        largeUnit: largeUnit,
        smallUnit: smallUnit,
      })),
    );

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: admin.userId,
      actorType: 'admin',
      action: 'CREATE_TEXTBOOK',
      targetType: 'textbook',
      targetId: textbook.textbookId,
      description: `Admin created a textbook (textbookId: ${textbook.textbookId})`,
      createdAt: new Date(),
    });
    return textbook;
  }

  // 교재 목록 조회
  async getAllTextbooks() {
    const textbooks = await this.textbookRepository.find();
    return textbooks;
  }

  // 교재 상세 조회
  async getTextbookById(textbookId: number) {
    const textbook = await this.textbookRepository.findOne({
      where: { textbookId },
      select: {
        textbookId: true,
        name: true,
        grade: true,
        largeUnit: true,
        smallUnit: true,
      },
    });

    if (!textbook) {
      throw new NotFoundException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NOT_FOUND);
    }
    return textbook;
  }

  // 교재 수정
  async updateTextbook(
    { name, grade }: CreateTextbookDto,
    adminId: number,
    textbookId: number,
  ) {
    const admin = await this.adminRepository.findOneBy({ userId: adminId });
    if (!admin) {
      throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
    }

    const textbook = await this.textbookRepository.findOneBy({ textbookId });
    if (!textbook) {
      throw new NotFoundException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NOT_FOUND);
    }

    const nameChange = name && name !== textbook.name;
    const gradeChange = grade && grade !== textbook.grade;
    if (!nameChange && !gradeChange) {
      throw new BadRequestException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NO_CHANGE);
    }

    const patch: Partial<Textbook> = {};
    if (nameChange) patch.name = name;
    if (gradeChange) patch.grade = grade;
    await this.textbookRepository.update(textbookId, patch);

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: admin.userId,
      actorType: 'admin',
      action: 'UPDATE_TEXTBOOK',
      targetType: 'textbook',
      targetId: textbookId,
      description: `Admin updated a textbook (textbookId: ${textbookId})`,
      changes: patch,
      createdAt: new Date(),
    });
    return;
  }

  // 교재 삭제
  async deleteTextbook(textbookId: number, adminId: number) {
    const admin = await this.adminRepository.findOneBy({ userId: adminId });
    if (!admin) {
      throw new NotFoundException(MESSAGES.ADMIN.USER.ERROR.NOT_FOUND);
    }

    const textbook = await this.textbookRepository.findOneBy({ textbookId });
    if (!textbook) {
      throw new NotFoundException(MESSAGES.ADMIN.TEXTBOOK.ERROR.NOT_FOUND);
    }

    await this.textbookRepository.softDelete(textbookId);

    // 로그 저장
    await this.actionLogRepository.save({
      actorId: admin.userId,
      actorType: 'admin',
      action: 'DELETE_TEXTBOOK',
      targetType: 'textbook',
      targetId: textbookId,
      description: `Admin deleted a textbook (textbookId: ${textbookId})`,
      createdAt: new Date(),
    });
  }
}
