import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

@Module({
  providers: [S3Service], // Nest가 S3Service를 생성할 수 있게 등록
  exports: [S3Service],
})
export class S3Module {}
