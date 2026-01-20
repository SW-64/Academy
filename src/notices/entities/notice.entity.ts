import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';
import { ClassNotice } from './class-notice.entity';

@Entity()
@Index(['pinned', 'createdAt']) // 고정 공지 최신순 조회용
export class Notice {
  @PrimaryGeneratedColumn({ name: 'notice_id', comment: '공지 id' })
  noticeId: number;

  @Column({ name: 'admin_id', nullable: true, comment: '관리자 id' })
  adminId: number | null;

  @Column({ comment: '제목' })
  title: string;

  @Column({ type: 'text', comment: '내용' })
  content: string;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @ManyToOne(() => Admin, (admin) => admin.notice, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @OneToMany(() => ClassNotice, (cn) => cn.notice)
  classNotices: ClassNotice[];
}
