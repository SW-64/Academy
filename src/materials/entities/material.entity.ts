import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';
import { ClassMaterial } from './class-material.entity';

@Entity({ name: 'material' })
export class Material {
  @PrimaryGeneratedColumn({ type: 'int', name: 'material_id' })
  materialId: number;

  @Column({ type: 'int', name: 'admin_id' })
  adminId: number;

  @ManyToOne(() => Admin, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @Column({ type: 'varchar', length: 200, name: 'title', comment: '자료 제목' })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'description',
    comment: '자료 설명',
  })
  description: string | null;

  // S3 저장 정보
  @Column({
    type: 'varchar',
    length: 100,
    name: 's3_bucket',
    comment: 'S3 버킷명',
  })
  s3Bucket: string;

  @Index('uq_material_s3_key', { unique: true })
  @Column({
    type: 'varchar',
    length: 512,
    name: 's3_key',
    comment: 'S3 오브젝트 키(UUID 권장)',
  })
  s3Key: string;

  // 파일 메타(다운로드/표시/운영에 유용)
  @Column({
    type: 'varchar',
    length: 255,
    name: 'original_file_name',
    comment: '원본 파일명(다운로드 파일명 용도)',
  })
  originalFileName: string;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'mime_type',
    default: 'application/pdf',
    comment: 'MIME 타입 (기본: application/pdf)',
  })
  mimeType: string;

  @Column({
    type: 'bigint',
    name: 'size_bytes',
    comment: '파일 크기(bytes)',
  })
  sizeBytes: number;

  // timestamps
  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => ClassMaterial, (cm) => cm.material)
  classMaterials: ClassMaterial[];
}
