import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisService } from './analysis.service';

export interface TokenMeasureResult {
  image_count: number;
  total_tokens: number;
  per_image_tokens: number[];
}

const execFileAsync = promisify(execFile);

const CROP = {
  left:  { left: 60,   top: 620, width: 1654, height: 4343 },
  right: { left: 1794, top: 620, width: 1655, height: 4343 },
};

@Injectable()
export class PdfAnalysisService {
  private readonly logger = new Logger(PdfAnalysisService.name);

  constructor(
    private readonly analysisService: AnalysisService,
  ) {}

  async measureTokensRaw(file: Express.Multer.File, dpi = 300): Promise<TokenMeasureResult> {
    const tmpPdfPath = join(tmpdir(), `${uuidv4()}.pdf`);
    const tmpImgDir = join(tmpdir(), uuidv4());
    const outputPrefix = join(tmpImgDir, 'page');

    await writeFile(tmpPdfPath, file.buffer);
    await mkdir(tmpImgDir, { recursive: true });

    try {
      await execFileAsync('pdftoppm', ['-r', String(dpi), '-png', tmpPdfPath, outputPrefix]);
      const filenames = (await readdir(tmpImgDir)).sort();

      const buffers = await Promise.all(
        filenames.map((filename) => readFile(join(tmpImgDir, filename))),
      );

      const perImageTokens = await Promise.all(
        buffers.map((buf) => this.analysisService.estimateImageTokens(buf)),
      );

      return {
        image_count: buffers.length,
        total_tokens: perImageTokens.reduce((s, t) => s + t, 0),
        per_image_tokens: perImageTokens,
      };
    } finally {
      await Promise.all([
        unlink(tmpPdfPath).catch(() => {}),
        rm(tmpImgDir, { recursive: true, force: true }).catch(() => {}),
      ]);
    }
  }

  // 크롭 로직: PdfAnalysisService.convertAndEnqueue()의 CROP 상수 및 sharp().extract() 동일 적용
  async measureTokensCropped(file: Express.Multer.File, dpi = 300): Promise<TokenMeasureResult> {
    const tmpPdfPath = join(tmpdir(), `${uuidv4()}.pdf`);
    const tmpImgDir = join(tmpdir(), uuidv4());
    const outputPrefix = join(tmpImgDir, 'page');

    await writeFile(tmpPdfPath, file.buffer);
    await mkdir(tmpImgDir, { recursive: true });

    try {
      await execFileAsync('pdftoppm', ['-r', String(dpi), '-png', tmpPdfPath, outputPrefix]);
      const filenames = (await readdir(tmpImgDir)).sort();

      const croppedBuffers: Buffer[] = new Array(filenames.length * 2);
      await Promise.all(
        filenames.map(async (filename, pageIndex) => {
          const pageBuffer = await readFile(join(tmpImgDir, filename));
          const [leftBuffer, rightBuffer] = await Promise.all([
            sharp(pageBuffer).extract(CROP.left).png().toBuffer(),
            sharp(pageBuffer).extract(CROP.right).png().toBuffer(),
          ]);
          croppedBuffers[pageIndex * 2] = leftBuffer;
          croppedBuffers[pageIndex * 2 + 1] = rightBuffer;
        }),
      );

      const perImageTokens = await Promise.all(
        croppedBuffers.map((buf) => this.analysisService.estimateImageTokens(buf)),
      );

      return {
        image_count: croppedBuffers.length,
        total_tokens: perImageTokens.reduce((s, t) => s + t, 0),
        per_image_tokens: perImageTokens,
      };
    } finally {
      await Promise.all([
        unlink(tmpPdfPath).catch(() => {}),
        rm(tmpImgDir, { recursive: true, force: true }).catch(() => {}),
      ]);
    }
  }

  async convertAndEnqueueRaw(file: Express.Multer.File, dpi = 300): Promise<{ jobId: string }> {
    const jobId = uuidv4();

    this.logger.log(`[${jobId}] PDF 변환 시작 (크롭 없음)`);

    const tmpPdfPath = join(tmpdir(), `${jobId}.pdf`);
    const tmpImgDir = join(tmpdir(), jobId);
    const outputPrefix = join(tmpImgDir, 'page');

    await writeFile(tmpPdfPath, file.buffer);
    await mkdir(tmpImgDir, { recursive: true });

    try {
      await execFileAsync('pdftoppm', ['-r', String(dpi), '-png', tmpPdfPath, outputPrefix]);

      const filenames = (await readdir(tmpImgDir)).sort();
      this.logger.log(`[${jobId}] ${filenames.length}페이지 변환 완료`);

      const fileIds = await Promise.all(
        filenames.map(async (filename, pageIndex) => {
          const pageBuffer = await readFile(join(tmpImgDir, filename));
          const fileId = await this.analysisService.uploadFileToMoonshot(
            pageBuffer,
            `${pageIndex}.png`,
            'image/png',
          );
          this.logger.log(`[${jobId}] 페이지 ${pageIndex + 1} 업로드 완료`);
          return fileId;
        }),
      );

      this.logger.log(`[${jobId}] 총 ${filenames.length}페이지 처리 완료`);
      return this.analysisService.enqueueFromFileIds(jobId, fileIds);
    } finally {
      await Promise.all([
        unlink(tmpPdfPath).catch(() => {}),
        rm(tmpImgDir, { recursive: true, force: true }).catch(() => {}),
      ]);
    }
  }

  async convertAndEnqueue(file: Express.Multer.File, dpi = 300): Promise<{ jobId: string }> {
    const jobId = uuidv4();

    this.logger.log(`[${jobId}] PDF 변환 시작`);

    const tmpPdfPath = join(tmpdir(), `${jobId}.pdf`);
    const tmpImgDir = join(tmpdir(), jobId);
    const outputPrefix = join(tmpImgDir, 'page');

    await writeFile(tmpPdfPath, file.buffer);
    await mkdir(tmpImgDir, { recursive: true });

    try {
      await execFileAsync('pdftoppm', ['-r', String(dpi), '-png', tmpPdfPath, outputPrefix]);

      const filenames = (await readdir(tmpImgDir)).sort();
      this.logger.log(`[${jobId}] ${filenames.length}페이지 변환 완료`);

      const fileIds: string[] = new Array(filenames.length * 2);

      await Promise.all(
        filenames.map(async (filename, pageIndex) => {
          const pageBuffer = await readFile(join(tmpImgDir, filename));
          const [leftBuffer, rightBuffer] = await Promise.all([
            sharp(pageBuffer).extract(CROP.left).png().toBuffer(),
            sharp(pageBuffer).extract(CROP.right).png().toBuffer(),
          ]);

          const [leftFileId, rightFileId] = await Promise.all([
            this.analysisService.uploadFileToMoonshot(leftBuffer, `${pageIndex * 2}.png`, 'image/png'),
            this.analysisService.uploadFileToMoonshot(rightBuffer, `${pageIndex * 2 + 1}.png`, 'image/png'),
          ]);

          fileIds[pageIndex * 2] = leftFileId;
          fileIds[pageIndex * 2 + 1] = rightFileId;
          this.logger.log(`[${jobId}] 페이지 ${pageIndex + 1} 크롭/업로드 완료`);
        }),
      );

      this.logger.log(`[${jobId}] 총 ${filenames.length}페이지 처리 완료`);
      return this.analysisService.enqueueFromFileIds(jobId, fileIds);
    } finally {
      await Promise.all([
        unlink(tmpPdfPath).catch(() => {}),
        rm(tmpImgDir, { recursive: true, force: true }).catch(() => {}),
      ]);
    }
  }
}
