// src/textbook/entities/textbook.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { TextbookChapter } from './textbook-chapter.entity';

import { ClassTextbook } from '../../class-textbook/entities/class-textbook.entity';

@Entity({ name: 'textbook' })
export class Textbook {
  @PrimaryGeneratedColumn({ name: 'textbook_id' })
  textbookId: number;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'grade' })
  grade: number;

  // ERD에 있는 값 유지 (총 단원 수 메타로 쓸 경우)
  @Column({ name: 'large_unit', type: 'int' })
  largeUnit: number;

  @Column({ name: 'small_unit', type: 'int' })
  smallUnit: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  // relations
  @OneToMany(() => TextbookChapter, (c) => c.textbook)
  chapters: TextbookChapter[];

  @OneToMany(() => ClassTextbook, (ct) => ct.textbook)
  classTextbooks: ClassTextbook[];
}
