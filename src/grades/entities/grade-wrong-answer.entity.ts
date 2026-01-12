import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

import { Grade } from './grade.entity';
import { ExamDetail } from '../../exam/entities/exam-detail.entity';

@Entity({ name: 'grade_detail' })
@Unique('uq_grade_detail_grade_exam_detail', ['gradeId', 'examDetailId'])
@Index('idx_grade_detail_grade', ['gradeId'])
@Index('idx_grade_detail_exam_detail', ['examDetailId'])
export class GradeWrongAnswer {
  @PrimaryGeneratedColumn({ type: 'int', name: 'grade_detail_id' })
  gradeWrongAnswerId: number;

  @Column({ type: 'int', name: 'grade_id', comment: '성적 ID' })
  gradeId: number;

  @ManyToOne(() => Grade, (grade) => grade.gradeWrongAnswer, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'grade_id' })
  grade: Grade;

  @Column({
    type: 'int',
    name: 'exam_detail_id',
    comment: '시험 문항(시험정보) ID',
  })
  examDetailId: number;

  @ManyToOne(() => ExamDetail, (ed) => ed.gradeWrongAnswer, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'exam_detail_id' })
  examDetail: ExamDetail;

  @Column({
    type: 'boolean',
    name: 'is_correct',
    default: false,
    comment: '맞았는지 여부',
  })
  isCorrect: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
