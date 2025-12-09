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
export class Notice {
  @PrimaryGeneratedColumn({ comment: '공지 id' })
  noticeId: number;

  @Column({ name: 'admin_id', nullable: true, comment: '관리자 id' })
  adminId: number | null;

  @Column({ comment: '제목' })
  title: string;

  @Column({ type: 'text', comment: '내용' })
  content: string;

  @Column({ type: 'boolean', default: false, comment: '고정 여부' })
  pinned: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '삭제날짜' })
  deletedAt: Date | null;

  @ManyToOne(() => Admin, (admin) => admin.notice, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;
}
