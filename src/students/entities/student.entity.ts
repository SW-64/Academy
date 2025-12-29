import { Grade } from '../../grades/entities/grade.entity';
import { Parent } from '../../parents/entities/parent.entity';
import { User } from '../../users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  OneToOne,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity()
export class Student {
  @PrimaryGeneratedColumn({ name: 'student_id', comment: '학생 id' })
  studentId: number;

  @Column({ name: 'user_id', unique: true, comment: '유저 id' })
  userId: number;

  @Column({ name: 'parent_id', nullable: true, comment: '부모 id' })
  parentId: number | null;

  @Column({ comment: '학년' })
  grade: number;

  @Column({ comment: '학교' })
  school: string;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '삭제날짜' })
  deletedAt: Date | null;

  @OneToOne(() => User, (user) => user.student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Parent, (parent) => parent.student, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Parent | null;

  @OneToMany(() => Grade, (grade) => grade.student)
  grades: Grade[];
}
