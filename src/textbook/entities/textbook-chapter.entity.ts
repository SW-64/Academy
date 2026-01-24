// src/textbook/entities/textbook-chapter.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { Textbook } from './textbook.entity';
import { ProgressChapter } from '../../homework/entities/progress-chapter.entity';

@Entity({ name: 'textbook_chapter' })
@Index('uq_textbook_unit', ['textbookId', 'largeUnitNo', 'smallUnitNo'], {
  unique: true,
})
export class TextbookChapter {
  @PrimaryGeneratedColumn({ name: 'textbook_chapter_id' })
  textbookChapterId: number;

  @Column({ name: 'textbook_id', type: 'int' })
  textbookId: number;

  @Column({ name: 'large_unit_no', type: 'int' })
  largeUnitNo: number;

  @Column({ name: 'small_unit_no', type: 'int' })
  smallUnitNo: number;

  @ManyToOne(() => Textbook, (t) => t.chapters, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'textbook_id' })
  textbook: Textbook;

  @OneToMany(() => ProgressChapter, (pc) => pc.textbookChapter)
  progressChapters: ProgressChapter[];
}
