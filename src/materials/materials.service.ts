import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { DataSource, In, Repository } from 'typeorm';
import { MESSAGES } from '../constants/message.constant';

import { Material } from './entities/material.entity';
import { ClassMaterial } from './entities/class-material.entity';
import { Class } from '../class/entities/class.entity';

import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

import { randomUUID } from 'crypto';
import { S3Service } from '../s3/s3.service';
import { Student } from '../students/entities/student.entity';
import { StudentClass } from '../student-class/entities/student-class.entity';
import { Admin } from '../admin/entities/admin.entity';

type StudentMaterialListItem = {
  materialId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  hasFile: boolean;
};

@Injectable()
export class MaterialsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(ClassMaterial)
    private readonly classMaterialRepository: Repository<ClassMaterial>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(StudentClass)
    private readonly studentClassRepository: Repository<StudentClass>,
  ) {}

  /**
   * (1) 트랜잭션 일관성을 위해, manager repo로 class 존재 검증
   */
  private async validateClassesExistWithRepo(
    classRepo: Repository<Class>,
    classIds: number[],
  ) {
    const uniq = [...new Set(classIds)];

    const classes = await classRepo.find({
      where: { classId: In(uniq) },
      select: ['classId'],
    });

    const exist = new Set(classes.map((c) => c.classId));
    const missing = uniq.filter((id) => !exist.has(id));

    if (missing.length) {
      throw new BadRequestException(
        MESSAGES.ADMIN.MATERIAL.ERROR.CLASS_NOT_FOUND,
      );
    }

    return uniq;
  }

  /**
   * 생성: material 저장 + class_material 매핑 저장
   */
  async createMaterial(dto: CreateMaterialDto, adminId: number) {
    return this.dataSource.transaction(async (manager) => {
      const materialRepo = manager.getRepository(Material);
      const cmRepo = manager.getRepository(ClassMaterial);
      const classRepo = manager.getRepository(Class);
      const adminRepo = manager.getRepository(Admin);

      const admin = await adminRepo.findOne({
        where: { userId: adminId },
        select: ['adminId'],
      });

      const classIds = await this.validateClassesExistWithRepo(
        classRepo,
        dto.classIds,
      );
      console.log(admin);

      const material = materialRepo.create({
        adminId: admin.adminId,
        title: dto.title,
        description: dto.description ?? null,
      });

      const saved = await materialRepo.save(material);

      await cmRepo.save(
        classIds.map((classId) =>
          cmRepo.create({
            classId,
            materialId: saved.materialId,
          }),
        ),
      );

      return saved;
    });
  }

  /**
   * 목록: sort + (선택) classId 필터 + paginate
   * (3) 조인 중복 row 방지를 위해 distinct(true)
   */
  async getAllMaterials(
    options: IPaginationOptions,
    sortOption: 'created_desc' | 'title_asc',
    classId: number | null,
  ): Promise<Pagination<Material>> {
    const qb = this.materialRepository
      .createQueryBuilder('m')
      // (4) deletedAt은 쿼리에서 조건으로 필터
      .where('m.deleted_at IS NULL')
      // (3) join 확장/복잡화에도 중복 row 방지
      .distinct(true);

    // 특정 반에 배포된 자료만 보고 싶으면 join해서 필터
    if (classId && classId > 0) {
      qb.innerJoin(
        'm.classMaterials',
        'cm',
        'cm.deleted_at IS NULL AND cm.class_id = :classId',
        { classId },
      );
    }

    // 필요한 컬럼만 선택 (list 응답 최소화)
    qb.select([
      'm.materialId',
      'm.adminId',
      'm.title',
      'm.createdAt',
      'm.updatedAt',
    ]);

    switch (sortOption) {
      case 'title_asc':
        qb.orderBy('m.title', 'ASC').addOrderBy('m.materialId', 'DESC');
        break;
      case 'created_desc':
      default:
        qb.orderBy('m.created_at', 'DESC').addOrderBy('m.materialId', 'DESC');
        break;
    }

    return paginate(qb, options);
  }

  /**
   * 상세: material + 배포 반 목록(classIds)
   * (4) deletedAt 조건을 쿼리에서 필터
   */
  async getMaterial(materialId: number) {
    const material = await this.materialRepository.findOne({
      where: { materialId, deletedAt: null },
    });

    if (!material) {
      throw new NotFoundException(MESSAGES.ADMIN.MATERIAL.ERROR.NOT_FOUND);
    }

    const classLinks = await this.classMaterialRepository.find({
      where: { materialId },
      select: ['classId', 'deletedAt'],
    });

    const classIds = classLinks
      .filter((x) => !x.deletedAt)
      .map((x) => x.classId);

    return {
      materialId: material.materialId,
      adminId: material.adminId,
      title: material.title,
      originalFileName: material.originalFileName,
      description: material.description,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      classIds,
    };
  }

  /**
   * 수정: title/description 변경 + (선택) classIds 교체
   * - 기존과 동일한 값이면 "변경 없음" 처리
   * - classIds도 기존 연결과 동일하면 "변경 없음" 처리
   */
  async updateMaterial(
    materialId: number,
    dto: UpdateMaterialDto,
    adminId: number,
  ) {
    // 1) 요청 자체가 아무 것도 없으면 즉시 차단
    const hasAnyField =
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.classIds !== undefined;

    if (!hasAnyField) {
      throw new BadRequestException(
        MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.NO_CHANGES,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const materialRepo = manager.getRepository(Material);
      const cmRepo = manager.getRepository(ClassMaterial);
      const classRepo = manager.getRepository(Class);

      // 2) 트랜잭션 내부에서 material 최신 상태 조회 (삭제 제외)
      const existed = await materialRepo.findOne({
        where: { materialId, deletedAt: null },
        select: ['materialId', 'adminId', 'title', 'description'],
      });

      if (!existed) {
        throw new NotFoundException(MESSAGES.ADMIN.MATERIAL.ERROR.NOT_FOUND);
      }

      // (선택) 작성자/관리자 권한 체크가 필요하다면 여기서
      // if (existed.adminId !== adminId) throw new ForbiddenException(...);

      // 3) 실제 변경분만 patch에 담기 (기존과 동일하면 제외)
      const patch: Partial<Material> = {};

      if (dto.title !== undefined && dto.title !== existed.title) {
        patch.title = dto.title;
      }

      if (
        dto.description !== undefined &&
        dto.description !== existed.description
      ) {
        patch.description = dto.description; // string | null
      }

      const willReplaceClasses = dto.classIds !== undefined;

      // 4) classIds가 들어온 경우 "실제 변경 여부" 판정(순서 무관, 중복 무시)
      if (willReplaceClasses) {
        const nextClassIds = await this.validateClassesExistWithRepo(
          classRepo,
          dto.classIds!, // validate에서 중복 제거/정규화된 배열을 반환한다고 가정
        );
        const nextSet = new Set(nextClassIds);

        // 현재 활성 링크(삭제 안 된 것)만 기준으로 비교
        const currentLinks = await cmRepo.find({
          where: { materialId, deletedAt: null },
          select: ['classId'],
        });
        const currentSet = new Set(currentLinks.map((x) => x.classId));

        const sameSize = currentSet.size === nextSet.size;
        const sameMembers =
          sameSize && [...currentSet].every((id) => nextSet.has(id));

        const hasMetadataChange = Object.keys(patch).length > 0;

        // 메타데이터도 변경 없고, 클래스 연결도 동일하면 "변경 없음"
        if (!hasMetadataChange && sameMembers) {
          throw new BadRequestException(
            MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.NO_CHANGES,
          );
        }

        // 메타데이터는 변경 있고, 클래스 연결은 동일하면 클래스 작업은 생략 가능
        if (sameMembers) {
          if (Object.keys(patch).length > 0) {
            await materialRepo.update({ materialId }, patch);
          }
          return;
        }

        // 5) 여기부터는 클래스 교체가 "실제로" 필요한 경우만 수행

        // material 업데이트
        if (Object.keys(patch).length > 0) {
          await materialRepo.update({ materialId }, patch);
        }

        // 기존 링크(삭제 포함) 전체 조회해서 restore/insert/soft delete 계산
        const existingLinks = await cmRepo.find({
          where: { materialId },
          select: ['classMaterialId', 'classId', 'deletedAt'],
        });

        const existingByClassId = new Map<number, Date | null>();
        for (const row of existingLinks) {
          existingByClassId.set(row.classId, row.deletedAt);
        }

        const toRestore: number[] = [];
        const toInsert: number[] = [];

        for (const classId of nextClassIds) {
          const deletedAt = existingByClassId.get(classId);
          if (deletedAt === undefined) {
            toInsert.push(classId);
            continue;
          }
          if (deletedAt) {
            toRestore.push(classId);
          }
        }

        const toSoftDelete: number[] = [];
        for (const row of existingLinks) {
          if (!row.deletedAt && !nextSet.has(row.classId)) {
            toSoftDelete.push(row.classId);
          }
        }

        if (toSoftDelete.length > 0) {
          await cmRepo
            .createQueryBuilder()
            .update(ClassMaterial)
            .set({ deletedAt: () => 'CURRENT_TIMESTAMP(6)' })
            .where('material_id = :materialId', { materialId })
            .andWhere('deleted_at IS NULL')
            .andWhere('class_id IN (:...classIds)', { classIds: toSoftDelete })
            .execute();
        }

        if (toRestore.length > 0) {
          await cmRepo
            .createQueryBuilder()
            .update(ClassMaterial)
            .set({ deletedAt: null })
            .where('material_id = :materialId', { materialId })
            .andWhere('deleted_at IS NOT NULL')
            .andWhere('class_id IN (:...classIds)', { classIds: toRestore })
            .execute();
        }

        if (toInsert.length > 0) {
          await cmRepo.insert(
            toInsert.map((classId) => ({
              materialId,
              classId,
            })),
          );
        }

        return;
      }

      // 6) classIds 미포함: 메타데이터만 변경
      if (Object.keys(patch).length === 0) {
        throw new BadRequestException(
          MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.NO_CHANGES,
        );
      }

      await materialRepo.update({ materialId }, patch);
    });

    return;
  }

  /**
   * 삭제: material soft delete + class_material soft delete
   * (4) material 삭제 여부는 쿼리 단계에서 필터
   */
  async deleteMaterial(materialId: number, adminId: number) {
    const existed = await this.materialRepository.findOne({
      where: { materialId, deletedAt: null },
      select: ['materialId'],
    });

    if (!existed) {
      throw new NotFoundException(MESSAGES.ADMIN.MATERIAL.ERROR.NOT_FOUND);
    }

    await this.dataSource.transaction(async (manager) => {
      const materialRepo = manager.getRepository(Material);
      const cmRepo = manager.getRepository(ClassMaterial);

      await materialRepo
        .createQueryBuilder()
        .update(Material)
        .set({ deletedAt: () => 'CURRENT_TIMESTAMP(6)' })
        .where('material_id = :materialId', { materialId })
        .andWhere('deleted_at IS NULL')
        .execute();

      await cmRepo
        .createQueryBuilder()
        .update(ClassMaterial)
        .set({ deletedAt: () => 'CURRENT_TIMESTAMP(6)' })
        .where('material_id = :materialId', { materialId })
        .andWhere('deleted_at IS NULL')
        .execute();
    });

    return;
  }

  async uploadMaterialFile(
    materialId: number,
    file: Express.Multer.File,
    adminId: number,
  ) {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) throw new BadRequestException('S3_BUCKET_NAME is not set');

    // 파일 원본명 깨짐 방지
    const safeOriginalName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );

    const newKey = `materials/${materialId}/${randomUUID()}.pdf`;

    // S3 업로드는 DB 트랜잭션과 별개이므로, 이후 실패 시 보상 삭제 필요
    await this.s3Service.uploadPdf({
      bucket,
      key: newKey,
      body: file.buffer,
      contentType: file.mimetype || 'application/pdf',
    });

    let oldKeyToDelete: string | null = null;

    try {
      await this.dataSource.transaction(async (manager) => {
        const materialRepo = manager.getRepository(Material);

        const existed = await materialRepo.findOne({
          where: { materialId, deletedAt: null },
          select: ['materialId', 'adminId', 's3Key'],
        });

        if (!existed) {
          throw new NotFoundException(MESSAGES.ADMIN.MATERIAL.ERROR.NOT_FOUND);
        }

        oldKeyToDelete = existed.s3Key ?? null;

        await materialRepo.update(
          { materialId },
          {
            s3Bucket: bucket,
            s3Key: newKey,
            originalFileName: safeOriginalName,
            mimeType: file.mimetype || 'application/pdf',
            sizeBytes: file.size,
          },
        );
      });
    } catch (err) {
      // DB 실패 시 방금 업로드한 새 파일은 정리(보상 삭제)
      try {
        await this.s3Service.deleteObject({ bucket, key: newKey });
      } catch {
        // best-effort (운영에서는 logger로 기록 권장)
      }
      throw err;
    }

    // 성공 후 기존 파일 정리(best-effort)
    if (oldKeyToDelete && oldKeyToDelete !== newKey) {
      try {
        await this.s3Service.deleteObject({ bucket, key: oldKeyToDelete });
      } catch {
        // best-effort
      }
    }

    return {
      materialId,
      s3Bucket: bucket,
      s3Key: newKey,
      originalFileName: safeOriginalName,
      mimeType: file.mimetype || 'application/pdf',
      sizeBytes: file.size,
    };
  }

  // 학생용 학습자료 다운로드 URL 발급
  async getStudentMaterialDownloadUrl(materialId: number, userId: number) {
    // 1) 학생 조회(userId -> studentId)
    const student = await this.studentRepository.findOne({
      where: { userId, deletedAt: null },
      select: ['studentId', 'userId'],
    });

    // 2) material 존재 + 업로드 완료 여부 확인
    const material = await this.materialRepository.findOne({
      where: { materialId, deletedAt: null },
      select: [
        'materialId',
        's3Bucket',
        's3Key',
        'originalFileName',
        'mimeType',
        'sizeBytes',
      ],
    });

    if (!material) {
      throw new NotFoundException(MESSAGES.ADMIN.MATERIAL.ERROR.NOT_FOUND);
    }

    // 업로드 전(material에 s3Key가 없는 상태) 방어
    if (!material.s3Bucket || !material.s3Key) {
      throw new BadRequestException(
        MESSAGES.ADMIN.MATERIAL.ERROR.FILE_NOT_UPLOADED,
      );
    }

    // 3) 권한 체크: student_class(sc) ↔ class_material(cm) 조인으로 존재 여부 확인
    // sc.deleted_at IS NULL, cm.deleted_at IS NULL 조건 필수
    const allowed = await this.studentClassRepository
      .createQueryBuilder('sc')
      .innerJoin(
        ClassMaterial,
        'cm',
        'cm.class_id = sc.class_id AND cm.deleted_at IS NULL AND cm.material_id = :materialId',
        { materialId },
      )
      .where('sc.student_id = :studentId', { studentId: student.studentId })
      .andWhere('sc.deleted_at IS NULL')
      .getExists();

    if (!allowed) {
      throw new ForbiddenException(
        MESSAGES.ADMIN.MATERIAL.ERROR.FORBIDDEN ??
          '해당 자료에 접근 권한이 없습니다.',
      );
    }

    // 4) Presigned URL 발급
    const url = await this.s3Service.getPresignedDownloadUrl({
      bucket: material.s3Bucket,
      key: material.s3Key,
      fileName: material.originalFileName ?? 'material.pdf',
      expiresInSeconds: 120, // 2분 권장(필요시 조절)
    });

    return {
      materialId: material.materialId,
      url,
      expiresInSeconds: 120,
      fileName: material.originalFileName,
    };
  }

  // 학생용 학습자료 목록 조회
  async getStudentMaterials(
    userId: number,
    options: IPaginationOptions,
    sortOption: 'created_desc' | 'title_asc',
    classId: number | null,
  ): Promise<Pagination<StudentMaterialListItem>> {
    // 1) userId -> studentId
    const student = await this.studentRepository.findOne({
      where: { userId, deletedAt: null },
      select: ['studentId'],
    });

    if (!student) {
      throw new NotFoundException(MESSAGES.STUDENTS.ERROR.NOT_FOUND);
    }

    // 2) 내 반(student_class) + 배포(class_material)로 접근 가능한 material만 조인
    const qb = this.materialRepository
      .createQueryBuilder('m')
      .innerJoin(
        ClassMaterial,
        'cm',
        'cm.material_id = m.material_id AND cm.deleted_at IS NULL',
      )
      .innerJoin(
        StudentClass,
        'sc',
        'sc.class_id = cm.class_id AND sc.deleted_at IS NULL AND sc.student_id = :studentId',
        { studentId: student.studentId },
      )
      .where('m.deleted_at IS NULL')
      .distinct(true);

    // (선택) 특정 반만 보기
    if (classId && classId > 0) {
      qb.andWhere('cm.class_id = :classId', { classId });
    }

    // 3) 목록 최소 필드만 선택
    // hasFile: s3_key 존재 여부로 계산
    qb.select([
      'm.materialId',
      'm.title',
      'm.createdAt',
      'm.updatedAt',
      'm.s3Key',
    ]);

    // 4) 정렬
    switch (sortOption) {
      case 'title_asc':
        qb.orderBy('m.title', 'ASC').addOrderBy('m.material_id', 'DESC');
        break;
      case 'created_desc':
      default:
        qb.orderBy('m.created_at', 'DESC').addOrderBy('m.material_id', 'DESC');
        break;
    }

    // 5) paginate
    // paginate가 raw select를 다룰 때는 getRawMany 기반으로도 동작하지만,
    // 타입 캐스팅을 위해 아래처럼 transform을 권장
    const page = await paginate(qb, options);

    // items를 StudentMaterialListItem 형태로 변환
    const items: StudentMaterialListItem[] = page.items.map((m: any) => ({
      materialId: m.materialId,
      title: m.title,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      hasFile: Boolean(m.s3Key),
    }));
    return {
      ...page,
      items,
    };
  }
}
