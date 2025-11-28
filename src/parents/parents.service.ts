import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { Repository } from 'typeorm';
import { MESSAGES } from 'src/constants/message.constant';
import { RedisClient } from './../redis/redis.client';
import { generateCode } from '../util/code.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    private readonly redisClient: RedisClient,
    private readonly configService: ConfigService,
  ) {}

  async getParentByUserId(userId: number) {
    const parent = await this.parentRepository.findOne({
      where: { userId },
      select: ['parentId'],
    });
    return parent ? parent.parentId : null;
  }

  async getMyStudents(parentId: number) {
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

  // 자녀 추가(연동 요청)
  async createStudentLinkRequest(userId: number) {
    // 0. 유저 유효성검증
    const parent = await this.parentRepository.findOneBy({ userId });
    if (!parent) {
      throw new NotFoundException(MESSAGES.USER.NOT_FOUND);
    }

    // 1. 부모 기준으로 기존 코드 조회
    const parentKey = `link:parent:${parent.parentId}`;
    const oldCode = await this.redisClient.get(parentKey);

    if (oldCode) {
      await this.redisClient.del(`link:code:${oldCode}`);
    }

    // 2. 새 코드 생성
    const code = generateCode();

    // 3. code 기준과 parent 기준 키 둘 다 세팅
    await this.redisClient.setJson(
      `link:code:${code}`,
      { parentId: parent.parentId },
      this.configService.get<number>('LINK_CODE_EXPIRES_IN'), // TTL(초)
    );

    await this.redisClient.setString(
      parentKey,
      code,
      this.configService.get<number>('LINK_CODE_EXPIRES_IN'),
    );
    await this.saveLinkCode(code, parent.parentId);

    return code;
  }

  // Redis에 링크 코드 저장
  async saveLinkCode(code: string, parentId: number) {
    const expiresIn = this.configService.get<number>('LINK_CODE_EXPIRES_IN');
    await this.redisClient.setJson(
      `link:code:${code}`,
      { parentId },
      expiresIn,
    );
  }
}
