import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Grade } from '../../grades/entities/grade.entity';

@Entity()
export class Exam {
  @PrimaryGeneratedColumn({ name: 'exam_id', comment: '시험 id' })
  examId: number;

  @Column({ comment: '해당년도' })
  year: number;

  @Column({ name: 'exam_title', comment: '시험 이름' })
  examTitle: string;

  @Column({ name: 'exam_date', type: 'date', comment: '시험 날짜' })
  @Index()
  examDate: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: '시험 평균',
    name: 'student_average',
  })
  studentAverage: string | null;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '삭제날짜' })
  deletedAt: Date | null;

  @OneToMany(() => Grade, (g) => g.exam)
  grades: Grade[];
}
