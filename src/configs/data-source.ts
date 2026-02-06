// src/config/data-source.ts
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// ✅ .env 파일 수동 로드
dotenv.config();
const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: configService.get('DB_HOST') || 'localhost',
  port: configService.get('DB_PORT') || 3306,
  username: configService.get('DB_USERNAME') || 'root',
  password: configService.get('DB_PASSWORD') || '',
  database: configService.get('DB_NAME') || 'your_db',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'], // 마이그레이션 파일 위치
  synchronize: false,
});
