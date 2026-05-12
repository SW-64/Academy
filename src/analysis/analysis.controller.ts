import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AnalysisService } from './analysis.service';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/jpg', 'image/png'];

@Controller('solve')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  async solve(@UploadedFiles() files: Express.Multer.File[]) {
    this.validateFiles(files);
    return this.analysisService.enqueue(files);
  }

  @Get(':jobId')
  async getStatus(@Param('jobId') jobId: string) {
    return this.analysisService.getStatus(jobId);
  }

  @Patch(':jobId/problem/:problemNum')
  async retryProblem(
    @Param('jobId') jobId: string,
    @Param('problemNum', ParseIntPipe) problemNum: number,
    @Body() body: { customPrompt?: string },
  ) {
    return this.analysisService.retryProblem(jobId, problemNum, body.customPrompt);
  }

  private validateFiles(files: Express.Multer.File[]): void {
    if (!files || files.length === 0) {
      throw new BadRequestException('이미지를 하나 이상 업로드해야 합니다.');
    }
    for (const file of files) {
      if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          `${file.originalname}은 허용되지 않는 파일 형식입니다. jpg, jpeg, png만 허용됩니다.`,
        );
      }
    }
  }
}
