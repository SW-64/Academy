// src/class-textbook/entities/class-textbook.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Textbook } from '../../textbook/entities/textbook.entity';
import { Class } from '../../class/entities/class.entity';

@Entity({ name: 'class_textbook' })
@Index('uq_class_textbook', ['classId', 'textbookId'], { unique: true })
export class ClassTextbook {
  @PrimaryGeneratedColumn({ name: 'class_textbook_id' })
  classTextbookId: number;

  @Column({ name: 'class_id', type: 'int' })
  classId: number;

  @Column({ name: 'textbook_id', type: 'int' })
  textbookId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => Class, (c) => c.classTextbooks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'class_id', referencedColumnName: 'classId' })
  clazz: Class;

  @ManyToOne(() => Textbook, (t) => t.classTextbooks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'textbook_id', referencedColumnName: 'textbookId' })
  textbook: Textbook;
}
