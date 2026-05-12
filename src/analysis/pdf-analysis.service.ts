import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../s3/s3.service';
import { AnalysisService } from './analysis.service';

const execFileAsync = promisify(execFile);

const CROP_RATIO = {
  left:          { x: 60 / 3509, width: 1654 / 3509 },
  right:         { x: 1794 / 3509, width: 1655 / 3509 },
  headerRatio:   620 / 4963,
  contentRatio:  (4963 - 620) / 4963,
};

function buildCrops(imgWidth: number, imgHeight: number) {
  const top    = Math.round(imgHeight * CROP_RATIO.headerRatio);
  const height = Math.round(imgHeight * CROP_RATIO.contentRatio);
  return {
    left:  { left: Math.round(imgWidth * CROP_RATIO.left.x),  top, width: Math.round(imgWidth * CROP_RATIO.left.width),  height },
    right: { left: Math.round(imgWidth * CROP_RATIO.right.x), top, width: Math.round(imgWidth * CROP_RATIO.right.width), height },
  };
}

@Injectable()
export class PdfAnalysisService {
  private readonly logger = new Logger(PdfAnalysisService.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly analysisService: AnalysisService,
  ) {}

  async convertAndEnqueue(file: Express.Multer.File): Promise<{ jobId: string }> {
    const jobId = uuidv4();
    const bucket = process.env.R2_BUCKET_NAME!;

    this.logger.log(`[${jobId}] PDF 변환 시작`);

    const tmpPdfPath = join(tmpdir(), `${jobId}.pdf`);
    const tmpImgDir = join(tmpdir(), jobId);
    const outputPrefix = join(tmpImgDir, 'page');

    await writeFile(tmpPdfPath, file.buffer);
    await mkdir(tmpImgDir, { recursive: true });

    try {
      await execFileAsync('pdftoppm', ['-r', '300', '-png', tmpPdfPath, outputPrefix]);

      const filenames = (await readdir(tmpImgDir)).sort();
      this.logger.log(`[${jobId}] ${filenames.length}페이지 변환 완료`);

      const keys: string[] = new Array(filenames.length * 2);

      await Promise.all(
        filenames.map(async (filename, pageIndex) => {
          const pageBuffer = await readFile(join(tmpImgDir, filename));
          const { width, height } = await sharp(pageBuffer).metadata();
          const crops = buildCrops(width!, height!);

          const [leftBuffer, rightBuffer] = await Promise.all([
            sharp(pageBuffer).extract(crops.left).jpeg({ quality: 95 }).toBuffer(),
            sharp(pageBuffer).extract(crops.right).jpeg({ quality: 95 }).toBuffer(),
          ]);

          const leftKey = `analysis/temp/${jobId}/${pageIndex * 2}.jpg`;
          const rightKey = `analysis/temp/${jobId}/${pageIndex * 2 + 1}.jpg`;

          await Promise.all([
            this.s3Service.uploadPdf({ bucket, key: leftKey, body: leftBuffer, contentType: 'image/jpeg' }),
            this.s3Service.uploadPdf({ bucket, key: rightKey, body: rightBuffer, contentType: 'image/jpeg' }),
          ]);

          keys[pageIndex * 2] = leftKey;
          keys[pageIndex * 2 + 1] = rightKey;
          this.logger.log(`[${jobId}] 페이지 ${pageIndex + 1} 크롭/업로드 완료`);
        }),
      );

      this.logger.log(`[${jobId}] 총 ${filenames.length}페이지 처리 완료`);
      return this.analysisService.enqueueFromR2Keys(jobId, keys);
    } finally {
      await Promise.all([
        unlink(tmpPdfPath).catch(() => {}),
        rm(tmpImgDir, { recursive: true, force: true }).catch(() => {}),
      ]);
    }
  }
}
