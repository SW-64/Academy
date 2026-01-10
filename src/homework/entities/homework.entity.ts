// src/homework/entities/homework.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Class } from '../../class/entities/class.entity';
import { Textbook } from '../../textbook/entities/textbook.entity';
import { Progress } from './progress.entity';
@Entity({ name: 'homework' })
@Index('uq_homework_class_textbook', ['classId', 'textbookId'], {
  unique: true,
})
export class Homework {
  @PrimaryGeneratedColumn({ name: 'homework_id' })
  homeworkId: number;

  @Column({ name: 'class_id', type: 'int' })
  classId: number;

  @Column({ name: 'textbook_id', type: 'int' })
  textbookId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Class, (c) => c.homeworks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'class_id', referencedColumnName: 'classId' })
  clazz: Class;

  @ManyToOne(() => Textbook, (t) => t.homeworks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'textbook_id', referencedColumnName: 'textbookId' })
  textbook: Textbook;

  @OneToMany(() => Progress, (p) => p.homework)
  progresses: Progress[];
}
