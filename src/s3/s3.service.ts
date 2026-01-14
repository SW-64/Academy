import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

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
}
