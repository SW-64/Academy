// src/homework/entities/progress.entity.ts
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
import { Student } from '../../students/entities/student.entity';

import { ProgressChapter } from './progress-chapter.entity';

@Entity({ name: 'progress' })
@Index('uq_progress_student_class_textbook', ['studentId', 'classTextbookId'], {
  unique: true,
})
export class Progress {
  @PrimaryGeneratedColumn({ name: 'homework_progress_id' })
  homeworkProgressId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'class_textbook_id', type: 'int' })
  classTextbookId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Student, (s) => s.progresses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @OneToMany(() => ProgressChapter, (pc) => pc.progress)
  chapters: ProgressChapter[];
}
