import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION,
  });

  async uploadPdf(params: {
    bucket: string;
    key: string;
    body: Buffer;
    contentType: string;
  }) {
    const { bucket, key, body, contentType } = params;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return { bucket, key };
  }

  async deleteObject(params: { bucket: string; key: string }) {
    const { bucket, key } = params;

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  // 다운로드용 프리사인드 URL 발급
  async getPresignedDownloadUrl(params: {
    bucket: string;
    key: string;
    fileName: string;
    expiresInSeconds?: number; // 예: 60~300
  }) {
    const { bucket, key, fileName, expiresInSeconds = 120 } = params;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: buildContentDisposition(fileName),
    });

    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
}

// RFC5987 filename* 지원 + ASCII fallback
function buildContentDisposition(fileName: string) {
  const fallback = fileName
    .replace(/[^\x20-\x7E]/g, '_') // 비-ASCII는 _
    .replace(/["\\]/g, '_'); // 따옴표/백슬래시 방어

  const encoded = encodeRFC5987(fileName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function encodeRFC5987(str: string) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
