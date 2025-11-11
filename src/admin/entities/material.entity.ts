import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { Admin } from './admin.entity';

@Entity()
export class Material {
  @PrimaryGeneratedColumn({ comment: '학습자료 id' })
  material_id: number;

  @Column({ name: 'admin_id', nullable: true, comment: '관리자 id' })
  admin_id: number | null;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '삭제날짜' })
  deletedAt: Date | null;

  @ManyToOne(() => Admin, (admin) => admin.material, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;
}
