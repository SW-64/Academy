import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'analysis' })
export class Analysis {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Index('uq_analysis_job_id', { unique: true })
  @Column({ type: 'varchar', length: 36, name: 'job_id', comment: 'BullMQ Job UUID' })
  jobId: string;

  @Column({ type: 'varchar', length: 255, name: 'original_file_name', comment: '원본 파일명' })
  originalFileName: string;

  @Column({ type: 'longtext', name: 'result', nullable: true, comment: 'Claude 분석 결과' })
  result: string | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'pending', comment: 'pending | completed | failed' })
  status: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
