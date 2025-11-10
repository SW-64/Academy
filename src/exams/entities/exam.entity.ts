import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Grade } from 'src/grades/entities/grade.entity';

export enum ExamType {
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  QUIZ = 'QUIZ',
}

@Entity()
export class Exam {
  @PrimaryGeneratedColumn({ comment: '시험 id' })
  exam_id: number;

  @Column({ comment: '해당년도' })
  year: number;

  @Column({ comment: '학기' })
  semester: number;

  @Column({
    type: 'enum',
    enum: ExamType,
    comment: '시험구분',
  })
  type: ExamType;

  @Column({ name: 'exam_date', type: 'datetime', comment: '시험 날짜' })
  exam_date: Date;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '삭제날짜' })
  deletedAt: Date | null;

  @OneToMany(() => Grade, (g) => g.exam)
  grades: Grade[];
}
