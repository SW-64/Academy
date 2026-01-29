import { BadRequestException, Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { BunnyService } from './bunny.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
import { StudentVideo } from './entities/student-video.entity';
import { Student } from '../students/entities/student.entity';
import { ActionLog } from '../action-logs/entities/action-logs.entity';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';

// 업로드 디렉토리 생성
const uploadDir = join(process.cwd(), 'uploads', 'videos');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, StudentVideo, Student, ActionLog]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5GB
        files: 1,
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('지원하지 않는 영상 형식입니다.'),
            false,
          );
        }
      },
    }),
  ],
  controllers: [VideosController],
  providers: [VideosService, BunnyService],
})
export class VideosModule {}
