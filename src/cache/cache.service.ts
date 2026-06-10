import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

const CACHE_ENABLED = true;

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  onModuleInit() {
    this.logger.log(`Cache is ${CACHE_ENABLED ? 'ENABLED' : 'DISABLED'}`);
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!CACHE_ENABLED) return undefined;
    return this.cache.get<T>(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!CACHE_ENABLED) return;
    await this.cache.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    if (!CACHE_ENABLED) return;
    await this.cache.del(key);
  }
}
