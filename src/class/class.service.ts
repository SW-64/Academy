import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { MESSAGES } from '../constants/message.constant';
import { ClassTextbook } from './../class-textbook/entities/class-textbook.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { StudentClass } from './../student-class/entities/student-class.entity';
import { ActionLog } from './../action-logs/entities/action-logs.entity';
import { Student } from './../students/entities/student.entity';
import { ClassStudentsResponse } from './dto/class-student.response.dto';
import { ClassMaterial } from './../materials/entities/class-material.entity';
import { ClassNotice } from './../notices/entities/class-notice.entity';
import { ClassListItem } from './dto/class.response.dto';
import { CACHE_KEYS, cacheKey } from '../constants/cache-keys.constant';

@Injectable()
export class ClassService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly dataSource: DataSource,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassTextbook)
    private readonly classTextbookRepository: Repository<ClassTextbook>,
  ) {}
  // 클래스 생성
  async createClass({ name, studentIds }: CreateClassDto, adminId: number) {
    const logger = new Logger('ClassService:createClass');
    const data = this.dataSource.transaction(async (manager) => {
      const classRepo = manager.getRepository(Class);
      const studentRepo = manager.getRepository(Student);
      const studentClassRepo = manager.getRepository(StudentClass);
      const logRepo = manager.getRepository(ActionLog);

      // 1) class 생성
      const newClass = await classRepo.save(
        classRepo.create({ className: name }),
      );
      const ids = [...new Set(studentIds ?? [])];
      if (ids.length > 0) {
        // 존재 검증
        const students = await studentRepo.find({
          where: { studentId: In(ids), deletedAt: IsNull() },
          select: { studentId: true },
        });
        const validSet = new Set(students.map((s) => s.studentId));
        const invalid = ids.filter((id) => !validSet.has(id));
        if (invalid.length) {
          throw new BadRequestException(
            `존재하지 않는 학생이 포함되어 있습니다: ${invalid.join(', ')}`,
          );
        }

        // insert (유니크 제약이 있다면 중복은 orIgnore 권장)
        await studentClassRepo
          .createQueryBuilder()
          .insert()
          .into(StudentClass)
          .values(
            ids.map((sid) => ({
              classId: newClass.classId,
              studentId: sid,
            })),
          )
          .orIgnore()
          .execute();
      }

      // 3) 로그
      await logRepo.save({
        actorId: adminId,
        actorType: 'admin',
        action: 'CREATE_CLASS',
        targetType: 'class',
        targetId: newClass.classId,
        description: `Admin created a class (classId: ${newClass.classId})`,
        createdAt: new Date(),
      });

      const data = { classId: newClass.classId };
      return data;
    });
    await this.invalidateClassCache(); // 캐시 무효화

    return data;
  }

  // 클래스의 학생 목록 조회
  async getAllStudentsOfClass(classId: number): Promise<ClassStudentsResponse> {
    // 캐시 확인
    const _cacheKey = cacheKey.adminClassStudentsList(classId);
    const CACHE_TTL = 10 * 60 * 1000; // 10분
    const logger = new Logger('ClassService:getAllStudentsOfClass');

    try {
      const cached = await this.cache.get<any>(_cacheKey);

      if (cached !== undefined && cached !== null) {
        return cached;
      }
    } catch (error) {
      logger.warn(`Cache GET failed: ${error.message}`, error.stack);
    }

    // Class를 기준으로 LEFT JOIN → 학생이 0명이어도 class는 유지
    const rows = await this.classRepository
      .createQueryBuilder('c')
      .leftJoin(
        StudentClass,
        'sc',
        'sc.class_id = c.class_id AND sc.deleted_at IS NULL',
      )
      .leftJoin(
        Student,
        's',
        's.student_id = sc.student_id AND s.deleted_at IS NULL',
      )
      .leftJoin('s.user', 'u')
      .where('c.class_id = :classId', { classId })
      .andWhere('c.deleted_at IS NULL')
      .select([
        'c.class_id AS classId',
        'c.class_name AS className',

        'sc.student_class_id AS studentClassId',
        's.student_id AS studentId',
        's.grade AS grade',
        's.school AS school',

        'u.user_id AS userId',
        'u.name AS name',
        'u.loginId AS loginId',
      ])
      .orderBy('u.name', 'ASC')
      .getRawMany();

    // 반 자체가 없으면 rows가 0개
    if (rows.length === 0) {
      throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
    }

    const classInfo = {
      classId: Number(rows[0].classId),
      className: rows[0].className,
    };

    const students = rows
      // 학생이 없는 반이면 LEFT JOIN 결과로 studentId가 null인 row가 1개 나올 수 있음
      .filter((r) => r.studentId != null)
      .map((r) => ({
        studentClassId: Number(r.studentClassId),
        studentId: Number(r.studentId),
        grade: r.grade,
        school: r.school,
        userId: Number(r.userId),
        name: r.name,
        loginId: r.loginId,
      }));
    try {
      await this.cache.set(_cacheKey, { ...classInfo, students }, CACHE_TTL);
    } catch (error) {
      logger.warn(`Cache SET failed: ${error.message}`, error.stack);
    }
    return { ...classInfo, students };
  }

  // 클래스 전체 목록 조회
  async getAllClasses() {
    // 캐시 확인
    const cacheKey = CACHE_KEYS.ADMIN_CLASSES_LIST;
    const CACHE_TTL = 10 * 60 * 1000; // 10분
    const logger = new Logger('ClassService:getAllClasses');
    try {
      const cached = await this.cache.get<ClassListItem[]>(cacheKey);

      if (cached !== undefined && cached !== null) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        return cached;
      }

      logger.debug(`Cache MISS: ${cacheKey}`);
    } catch (error) {
      // 캐시 조회 실패해도 계속 진행
      logger.warn(`Cache GET failed: ${error.message}`, error.stack);
    }

    const classes = await this.classRepository.find({
      where: { deletedAt: null },
      select: {
        classId: true,
        className: true,
        createdAt: true,
        updatedAt: true,
      },
      order: {
        className: 'ASC',
      },
    });

    try {
      await this.cache.set(cacheKey, classes, CACHE_TTL);
      logger.debug(`Cache SET: ${cacheKey}, TTL: ${CACHE_TTL}s`);
    } catch (error) {
      logger.warn(`Cache SET failed: ${error.message}`, error.stack);
    }

    return classes;
  }

  // 클래스 수정
  async updateClass(dto: UpdateClassDto, adminId: number, classId: number) {
    await this.dataSource.transaction(async (manager) => {
      const studentClassRepo = manager.getRepository(StudentClass);
      const logRepo = manager.getRepository(ActionLog);
      const classRepo = manager.getRepository(Class);
      const studentRepo = manager.getRepository(Student);

      let nameChanged = false;
      let studentsChanged = false;

      // 0) 사전 검증: 대상 반이 존재하는지 확인
      const existedClass = await classRepo.findOneBy({ classId });
      if (!existedClass) {
        throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
      }

      // 1) 반 이름 변경(옵션)
      if (dto.name !== undefined && dto.name !== null) {
        if (dto.name !== existedClass.className) {
          await classRepo.update(classId, { className: dto.name });
          nameChanged = true;
        }
      }

      // 2) 학생 구성 교체(옵션)
      if (dto.studentIds !== undefined) {
        // 2-1) 입력 정규화: 중복 제거
        const targetIds = [...new Set(dto.studentIds)];

        // 2-2) 입력 검증: 존재하지 않는 studentId가 포함되면 실패
        const students = await studentRepo.find({
          where: { studentId: In(targetIds) },
          select: { studentId: true },
        });
        const validSet = new Set(students.map((s) => s.studentId));
        const invalid = targetIds.filter((id) => !validSet.has(id));
        if (invalid.length) {
          throw new BadRequestException(
            `존재하지 않는 학생이 포함되어 있습니다: ${invalid.join(', ')}`,
          );
        }

        // 2-3) 현재 반의 학생 목록 로딩(현재 상태)
        const currentLinks = await studentClassRepo.find({
          where: { classId },
          select: { studentId: true },
        });
        const currentSet = new Set(currentLinks.map((l) => l.studentId));
        const targetSet = new Set(targetIds);
        // 2-4) diff 계산: remove(현재-목표), add(목표-현재)
        const removeIds = [...currentSet].filter((id) => !targetSet.has(id));
        const addIds = targetIds.filter((id) => !currentSet.has(id));

        // 2-5) 반 학생 링크 삭제
        if (removeIds.length) {
          await studentClassRepo.delete({
            classId,
            studentId: In(removeIds),
          });
        }
        // 2-6) 반 학생 링크 추가
        if (addIds.length) {
          await studentClassRepo
            .createQueryBuilder()
            .insert()
            .into(StudentClass)
            .values(addIds.map((sid) => ({ classId, studentId: sid })))
            .orIgnore()
            .execute();
        }
        studentsChanged = removeIds.length > 0 || addIds.length > 0;
      }

      // 3) 변경 없음시, 에러 처리
      if (!nameChanged && !studentsChanged) {
        throw new BadRequestException(MESSAGES.ADMIN.CLASS.ERROR.NO_CHANGE);
      }

      // 4) 액션 로그 기록(감사/추적 목적)
      await logRepo.save({
        actorId: adminId,
        actorType: 'admin',
        action: 'UPDATE_CLASS',
        targetType: 'class',
        targetId: classId,
        description: `Admin updated a class (classId: ${classId})`,
        changes: dto,
        createdAt: new Date(),
      });
      return;
    });
    await this.invalidateClassCache(); // 클래스 캐시 무효화
    await this.invalidateClassStudentCache(classId); // 학생 목록 캐시 무효화
    return;
  }

  // 클래스 삭제
  async deleteClass(adminId: number, classId: number) {
    await this.dataSource.transaction(async (manager) => {
      const classRepo = manager.getRepository(Class);
      const logRepo = manager.getRepository(ActionLog);
      const classMaterialRepo = manager.getRepository(ClassMaterial);
      const studentClassRepo = manager.getRepository(StudentClass);
      const classTextbookRepo = manager.getRepository(ClassTextbook);
      const classNoticeRepo = manager.getRepository(ClassNotice);

      const existed = await classRepo.existsBy({
        classId,
        deletedAt: IsNull(),
      });
      if (!existed) {
        throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
      }

      // 하위 연결 레코드 삭제
      // - Soft Delete: 복구 필요 (학생 연결, 학습자료)
      await studentClassRepo.softDelete({ classId });
      await classMaterialRepo.softDelete({ classId });

      // - Hard Delete: 복구 불필요 (교재 연결, 공지 - 재등록 가능)
      await classTextbookRepo.delete({ classId });
      await classNoticeRepo.delete({ classId });

      // 클래스 soft delete
      const r = await classRepo.softDelete({ classId });
      if (!r.affected) {
        // 이 시점에서 affected=0이면 거의 레이스 컨디션(다른 요청이 먼저 삭제)
        throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
      }

      // 로그 저장
      await logRepo.save({
        actorId: adminId,
        actorType: 'admin',
        action: 'DELETE_CLASS',
        targetType: 'class',
        targetId: classId,
        description: `Admin deleted a class (classId: ${classId})`,
        createdAt: new Date(),
      });
      return;
    });

    await this.invalidateClassCache(); // 캐시 무효화

    return;
  }

  // 클래스의 교재 목록 조회
  async getAllTextbooksOfClass(classId: number) {
    const existedClass = await this.classRepository.existsBy({ classId });
    if (!existedClass) {
      throw new NotFoundException(MESSAGES.ADMIN.CLASS.ERROR.NOT_FOUND);
    }

    const textbooks = await this.classTextbookRepository.find({
      where: { classId },
      relations: { textbook: true },
      select: {
        classTextbookId: true,
        classId: true,
        textbook: {
          textbookId: true,
          name: true,
          grade: true,
        },
      },
      order: {
        textbook: {
          name: 'ASC',
        },
      },
    });

    return textbooks;
  }

  /**
   * 클래스 관련 모든 캐시 무효화
   */
  private async invalidateClassCache(): Promise<void> {
    const logger = new Logger('ClassService:invalidateClassCache');
    try {
      await this.cache.del(CACHE_KEYS.ADMIN_CLASSES_LIST);
      logger.debug(`Cache invalidated: ${CACHE_KEYS.ADMIN_CLASSES_LIST}`);
    } catch (e: any) {
      logger.warn(`Cache invalidation failed: ${e?.message}`, e?.stack);
    }
  }

  /**
   * 클래스내 학생 관련 모든 캐시 무효화
   */
  private async invalidateClassStudentCache(classId: number): Promise<void> {
    const logger = new Logger('ClassService:invalidateClassStudentCache');
    try {
      await this.cache.del(cacheKey.adminClassStudentsList(classId));
      logger.debug(
        `Cache invalidated: ${cacheKey.adminClassStudentsList(classId)}`,
      );
    } catch (e: any) {
      logger.warn(`Cache invalidation failed: ${e?.message}`, e?.stack);
    }
  }
}
