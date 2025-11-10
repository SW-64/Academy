import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn({ comment: '토큰 id' })
  refreshtoken_id: number;

  @Column({ name: 'user_id', comment: '유저 id' })
  user_id: number;

  @Column({ comment: '리프레시 토큰(SHA256)' })
  refreshtoken: string;

  @CreateDateColumn({ name: 'created_at', comment: '생성날짜' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, comment: '만료날짜' })
  deletedAt: Date | null;

  @OneToOne(() => User, (user) => user.refreshToken, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
