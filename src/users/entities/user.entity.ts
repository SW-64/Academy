import { Admin } from 'src/admin/entities/admin.entity';
import { RefreshToken } from 'src/auth/entities/refreshtoken.entity';
import { Parent } from 'src/parents/entities/parent.entity';
import { Student } from 'src/students/entities/student.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
} from 'typeorm';

export enum Role {
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  ADMIN = 'ADMIN',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn({ comment: '유저 아이디' })
  user_id: number;

  @Column({ unique: true, comment: '이메일' })
  email: string;

  @Column({ comment: '이름' })
  name: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.STUDENT,
    comment: '역할',
  })
  role: Role;

  @Column({ unique: true, comment: '연락처처' })
  phone: string;

  @Column({ comment: '비밀번호' })
  password: string;

  @Column({ default: false, comment: '승인 여부' })
  isApproved: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '삭제날짜' })
  deletedAt: Date | null;

  @OneToOne(() => Student, (student) => student.user)
  student: Student;

  @OneToOne(() => Parent, (parent) => parent.user)
  parent: Parent;

  @OneToOne(() => Admin, (admin) => admin.user)
  admin: Admin;

  @OneToOne(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshToken: RefreshToken;
}
