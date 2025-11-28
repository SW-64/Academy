import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { redisConfig } from '../configs/redis.config';

@Injectable()
export class RedisClient implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly config: ConfigType<typeof redisConfig>,
  ) {
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
    });

    this.client.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // JSON 저장
  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    const str = JSON.stringify(value);
    const ttl = ttlSeconds ?? this.config.defaultTtl;

    if (ttl) {
      await this.client.set(key, str, 'EX', ttl);
    } else {
      await this.client.set(key, str);
    }
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const str = await this.client.get(key);
    if (!str) return null;
    return JSON.parse(str) as T;
  }

  // string 저장용 헬퍼 (parentKey 같은 거)
  async setString(key: string, value: string, ttlSeconds?: number) {
    const ttl = ttlSeconds ?? this.config.defaultTtl;

    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }
}
