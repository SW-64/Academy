import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdfAnalysisService } from './pdf-analysis.service';

@Controller('solve')
export class PdfAnalysisController {
  constructor(private readonly pdfAnalysisService: PdfAnalysisService) {}

  @Post('pdf')
  @UseInterceptors(FileInterceptor('file'))
  async solvePdf(
    @UploadedFile() file: Express.Multer.File,
    @Query('dpi', new DefaultValuePipe(300), ParseIntPipe) dpi: number,
  ) {
    if (!file) {
      throw new BadRequestException('PDF 파일을 업로드해야 합니다.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('PDF 파일만 허용됩니다.');
    }
    return this.pdfAnalysisService.convertAndEnqueue(file, dpi);
  }

  @Post('pdf/raw')
  @UseInterceptors(FileInterceptor('file'))
  async solvePdfRaw(
    @UploadedFile() file: Express.Multer.File,
    @Query('dpi', new DefaultValuePipe(300), ParseIntPipe) dpi: number,
  ) {
    if (!file) {
      throw new BadRequestException('PDF 파일을 업로드해야 합니다.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('PDF 파일만 허용됩니다.');
    }
    return this.pdfAnalysisService.convertAndEnqueueRaw(file, dpi);
  }

  @Post('pdf/measure-tokens')
  @UseInterceptors(FileInterceptor('file'))
  async measureTokensRaw(
    @UploadedFile() file: Express.Multer.File,
    @Query('dpi', new DefaultValuePipe(300), ParseIntPipe) dpi: number,
  ) {
    if (!file) {
      throw new BadRequestException('PDF 파일을 업로드해야 합니다.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('PDF 파일만 허용됩니다.');
    }
    return this.pdfAnalysisService.measureTokensRaw(file, dpi);
  }

  @Post('pdf/measure-tokens/cropped')
  @UseInterceptors(FileInterceptor('file'))
  async measureTokensCropped(
    @UploadedFile() file: Express.Multer.File,
    @Query('dpi', new DefaultValuePipe(300), ParseIntPipe) dpi: number,
  ) {
    if (!file) {
      throw new BadRequestException('PDF 파일을 업로드해야 합니다.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('PDF 파일만 허용됩니다.');
    }
    return this.pdfAnalysisService.measureTokensCropped(file, dpi);
  }
}
