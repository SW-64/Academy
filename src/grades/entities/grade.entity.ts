import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

import { Exam } from '../../exam/entities/exam.entity';
import { Student } from '../../students/entities/student.entity';
import { GradeWrongAnswer } from './grade-wrong-answer.entity';

export enum Level {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

@Entity({ name: 'grade' })
@Unique('uq_grade_exam_student', ['examId', 'studentId'])
@Index('idx_grade_exam', ['examId'])
@Index('idx_grade_student', ['studentId'])
export class Grade {
  @PrimaryGeneratedColumn({ type: 'int', name: 'grade_id' })
  gradeId: number;

  @Column({ type: 'int', name: 'exam_id', comment: '시험 ID' })
  examId: number;

  @ManyToOne(() => Exam, (exam) => exam.grades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @Column({ type: 'int', name: 'student_id', comment: '학생 ID' })
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'int', nullable: true, name: 'score', comment: '점수' })
  score: number | null;

  @Column({ type: 'int', nullable: true, name: 'level', comment: '등급(선택)' })
  level: number | null;

  @Column({ type: 'text', nullable: true, name: 'comment', comment: '코멘트' })
  comment: string | null;

  @Column({
    type: 'boolean',
    name: 'is_taken',
    default: false,
    comment: '응시 여부',
  })
  isTaken: boolean;

  @Column({
    type: 'int',
    name: 'ranking',
    nullable: true,
    comment: '반 내 순위',
  })
  ranking: number | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at' })
  deletedAt: Date;

  @OneToMany(() => GradeWrongAnswer, (gd) => gd.grade)
  gradeWrongAnswer: GradeWrongAnswer[];
}
