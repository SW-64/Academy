import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('action_logs')
export class ActionLog {
  @PrimaryGeneratedColumn({ name: 'action_logs_id' })
  actionLogsId: number;

  @Column({ name: 'actor_id' })
  actorId: number;

  @Column({
    name: 'actor_type',
    type: 'enum',
    enum: ['user', 'admin'],
  })
  actorType: 'user' | 'admin';

  @Column()
  action: string;

  @Column({ name: 'target_type', nullable: true })
  targetType: string;

  @Column({ name: 'target_id', nullable: true })
  targetId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  changes: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
