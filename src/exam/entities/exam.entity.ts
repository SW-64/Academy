import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Class } from '../../class/entities/class.entity';
import { ExamDetail } from './exam-detail.entity';
import { Grade } from '../../grades/entities/grade.entity';

@Entity({ name: 'exam' })
@Index('idx_exam_class_date', ['classId', 'examDate'])
export class Exam {
  @PrimaryGeneratedColumn({ type: 'int', name: 'exam_id' })
  examId: number;

  @Column({ type: 'int', name: 'class_id', comment: '반 ID' })
  classId: number;

  @ManyToOne(() => Class, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'exam_title',
    comment: '시험 이름',
  })
  examTitle: string;

  @Column({ type: 'datetime', name: 'exam_date', comment: '시험 날짜' })
  examDate: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'student_average',
    comment: '학생 평균',
  })
  studentAverage: string | null; // TypeORM은 decimal을 string으로 다루는 게 안전

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => ExamDetail, (detail) => detail.exam)
  examDetails: ExamDetail[];

  @OneToMany(() => Grade, (grade) => grade.exam)
  grades: Grade[];
}
