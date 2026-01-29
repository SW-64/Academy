import { VideoStatus } from '../entities/video.entity';

// 공통 기본 정보
export class VideoResponseDto {
  videoId: number;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
  status: VideoStatus;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  assignedStudentCount?: number;
}

// 학생용 상세 조회 DTO
export class VideoDetailForStudentDto {
  videoId: number;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
  viewCount: number;
  status: VideoStatus;
  createdAt: Date;
}

// 어드민용 상세 조회 DTO (할당된 학생 정보 포함)
export class VideoDetailForAdminDto {
  videoId: number;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
  status: VideoStatus;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  assignedStudents: AssignedStudentDto[];
}

// 할당된 학생 정보
export class AssignedStudentDto {
  studentId: number;
  name: string;
}

// 영상 재생 응답 (재생 버튼 클릭 시)
export class VideoPlaybackResponseDto {
  playbackUrl: string;
  thumbnailUrl: string | null;
  title: string;
  duration: number;
}

// 목록용 DTO
export class VideoListResponseDto {
  videoId: number;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
  status: VideoStatus;
  viewCount: number;
  createdAt: Date;
  assignedStudentCount?: number; // ADMIN용
}
