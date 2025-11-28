import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { redisConfig } from '../configs/redis.config';
import { RedisClient } from './redis.client';

@Module({
  imports: [
    ConfigModule.forFeature(redisConfig), // redisConfig를 이 모듈에서 사용
  ],
  providers: [RedisClient],
  exports: [RedisClient],
})
export class RedisModule {}
