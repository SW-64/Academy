import { Grade } from 'src/grades/entities/grade.entity';
import { Parent } from 'src/parents/entities/parent.entity';
import { User } from 'src/users/entities/user.entity';
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
  @PrimaryGeneratedColumn({ comment: '학생 id' })
  student_id: number;

  @Column({ name: 'user_id', unique: true, comment: '유저 id' })
  user_id: number;

  @Column({ name: 'parent_id', nullable: true, comment: '부모 id' })
  parent_id: number | null;

  @Column({ comment: '학년' })
  grade: number;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '삭제날짜' })
  deletedAt: Date | null;

  @OneToOne(() => User, (user) => user.student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Parent, (parent) => parent.student, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: Parent | null;

  @OneToMany(() => Grade, (grade) => grade.student)
  grades: Grade[];
}
