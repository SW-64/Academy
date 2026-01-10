// src/homework/entities/progress-chapter.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Progress } from './progress.entity';
import { TextbookChapter } from '../../textbook/entities/textbook-chapter.entity';

export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED', // 미시작
  IN_PROGRESS = 'IN_PROGRESS', // 진행중
  COMPLETED = 'COMPLETED', // 완료
}

@Entity({ name: 'progress_chapter' })
@Index('uq_progress_chapter', ['homeworkProgressId', 'textbookChapterId'], {
  unique: true,
})
export class ProgressChapter {
  @PrimaryGeneratedColumn({ name: 'progress_chapter_id' })
  progressChapterId: number;

  @Column({ name: 'homework_progress_id', type: 'int' })
  homeworkProgressId: number;

  @Column({ name: 'textbook_chapter_id', type: 'int' })
  textbookChapterId: number;

  @Column({ name: 'progress_percent', type: 'int', default: 0 })
  progressPercent: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ProgressStatus,
    default: ProgressStatus.NOT_STARTED,
  })
  status: ProgressStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => Progress, (p) => p.chapters, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'homework_progress_id',
  })
  progress: Progress;

  @ManyToOne(() => TextbookChapter, (tc) => tc.progressChapters, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'textbook_chapter_id',
  })
  textbookChapter: TextbookChapter;
}
