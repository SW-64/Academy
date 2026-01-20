import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Class } from '../../class/entities/class.entity';
import { Notice } from '../../notices/entities/notice.entity';

@Entity('class_notice')
@Unique('uq_class_notice', ['classId', 'noticeId'])
@Index('idx_class_notice_class_id', ['classId'])
@Index('idx_class_notice_notice_id', ['noticeId'])
export class ClassNotice {
  @PrimaryGeneratedColumn({ name: 'class_notice_id', type: 'int' })
  classNoticeId: number;

  @Column({ name: 'class_id', type: 'int' })
  classId: number;

  @Column({ name: 'notice_id', type: 'int' })
  noticeId: number;

  @Column({ type: 'boolean', default: false, comment: '고정 여부' })
  pinned: boolean;

  @ManyToOne(() => Class, (cls) => cls.classNotices, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'class_id', referencedColumnName: 'classId' })
  class: Class;

  @ManyToOne(() => Notice, (notice) => notice.classNotices, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'notice_id', referencedColumnName: 'noticeId' })
  notice: Notice;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
