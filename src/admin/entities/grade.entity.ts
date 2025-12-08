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
import { Student } from '../../students/entities/student.entity';
import { Exam } from '../../admin/entities/exam.entity';
export enum Level {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}
@Entity()
export class Grade {
  @PrimaryGeneratedColumn({ comment: '성적 id' })
  gradeId: number;

  @Column({ name: 'exam_id', comment: '시험 id' })
  examId: number;

  @Column({ name: 'student_id', comment: '학생 id' })
  studentId: number;

  @Column({ comment: '점수' })
  score: number;

  @Column({ comment: '등급' })
  level: Level;

  @Column('text', { nullable: true, comment: '코멘트' })
  comment: string;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '삭제날짜' })
  deletedAt: Date | null;

  @ManyToOne(() => Exam, (exam) => exam.grades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @ManyToOne(() => Student, (student) => student.grades, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;
}
