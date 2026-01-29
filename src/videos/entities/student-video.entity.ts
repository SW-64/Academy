import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Video } from './video.entity';
import { Student } from '../../students/entities/student.entity';

@Entity()
@Unique(['studentId', 'videoId'])
@Index(['studentId']) // 학생별 영상 조회
@Index(['videoId']) // 영상별 학생 조회
@Index(['createdAt']) // 할당일순 정렬 (나중에 필요할 수 있음)
export class StudentVideo {
  @PrimaryGeneratedColumn()
  studentVideoId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'video_id', type: 'int' })
  videoId: number;

  @ManyToOne(() => Student, (t) => t.studentVideos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => Video, (t) => t.studentVideos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
