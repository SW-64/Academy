import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisProcessor } from './analysis.processor';
import { PdfAnalysisController } from './pdf-analysis.controller';
import { PdfAnalysisService } from './pdf-analysis.service';
import { Analysis } from './entities/analysis.entity';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analysis]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: 6379,
          db: 1,
        },
      }),
    }),
    BullModule.registerQueue({ name: 'analysis' }),
    S3Module,
  ],
  controllers: [AnalysisController, PdfAnalysisController],
  providers: [AnalysisService, AnalysisProcessor, PdfAnalysisService],
})
export class AnalysisModule {}
