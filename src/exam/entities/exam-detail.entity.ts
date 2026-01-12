import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

import { Exam } from './exam.entity';
import { GradeWrongAnswer } from '../../grades/entities/grade-wrong-answer.entity';

@Entity({ name: 'exam_detail' })
@Unique('uq_exam_detail_exam_question', ['examId', 'question'])
@Index('idx_exam_detail_exam', ['examId'])
export class ExamDetail {
  @PrimaryGeneratedColumn({ type: 'int', name: 'exam_detail_id' })
  examDetailId: number;

  @Column({ type: 'int', name: 'exam_id', comment: '시험 ID' })
  examId: number;

  @ManyToOne(() => Exam, (exam) => exam.examDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @Column({ type: 'int', name: 'question', comment: '문항 번호' })
  question: number;

  @Column({ type: 'int', name: 'points', comment: '배점' })
  points: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'error_rate',
    comment: '오답률(0~100)',
  })
  errorRate: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => GradeWrongAnswer, (gd) => gd.examDetail)
  gradeWrongAnswer: GradeWrongAnswer[];
}
