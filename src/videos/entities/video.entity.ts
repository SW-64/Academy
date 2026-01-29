import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudentVideo } from './student-video.entity';

export enum VideoStatus {
  UPLOADING = 'uploading',
  ENCODING = 'encoding',
  READY = 'ready',
  FAILED = 'failed',
  DELETING = 'deleting',
}

@Entity()
@Index(['title']) // 이름순 정렬용
@Index(['status']) // 상태 필터링용
@Index(['createdAt']) // 생성일순 정렬용 (관리 화면)
export class Video {
  @PrimaryGeneratedColumn()
  videoId: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  bunnyVideoId: string; // Bunny의 Video GUID

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'int', default: 0 })
  duration: number; // 초 단위

  @Column({
    type: 'enum',
    enum: VideoStatus,
    default: VideoStatus.UPLOADING,
  })
  status: VideoStatus;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => StudentVideo, (cm) => cm.video)
  studentVideos: StudentVideo[];
}
