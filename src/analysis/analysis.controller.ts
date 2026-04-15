import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { AnalysisService } from './analysis.service';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  /**
   * PDF 업로드 → BullMQ 큐에 등록 → jobId 즉시 반환
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}_${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('PDF 파일만 업로드 가능합니다.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('PDF 파일을 첨부해주세요.');
    }

    const filePath = path.resolve(file.path);
    const jobId = await this.analysisService.enqueueAnalysis(filePath, file.originalname);

    return {
      statusCode: HttpStatus.ACCEPTED,
      message: '분석 요청이 접수되었습니다.',
      data: { jobId },
    };
  }

  /**
   * jobId로 분석 진행 상태 조회
   */
  @Get(':jobId/status')
  async getStatus(@Param('jobId') jobId: string) {
    const data = await this.analysisService.getStatus(jobId);
    return {
      statusCode: HttpStatus.OK,
      message: '분석 상태 조회 성공',
      data,
    };
  }
}
