import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Material } from './material.entity';
import { Video } from './video.entity';
import { Notice } from './notice.entity';

@Entity()
export class Admin {
  @PrimaryGeneratedColumn({ name: 'admin_id', comment: '관리자 id' })
  adminId: number;

  @Column({ name: 'user_id', unique: true, comment: '유저 id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '수정날짜' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '삭제날짜' })
  deletedAt: Date | null;

  @OneToOne(() => User, (user) => user.admin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Material, (m) => m.admin)
  material: Material[];

  @OneToMany(() => Video, (v) => v.admin)
  video: Video[];

  @OneToMany(() => Notice, (n) => n.admin)
  notice: Notice[];
}
