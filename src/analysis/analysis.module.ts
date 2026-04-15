import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AnalysisProcessor } from './analysis.processor';
import { Analysis } from './entities/analysis.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analysis]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: 6379,
          db: 1, // db:0은 캐시용, db:1은 BullMQ용
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'analysis',
    }),
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService, AnalysisProcessor],
})
export class AnalysisModule {}
