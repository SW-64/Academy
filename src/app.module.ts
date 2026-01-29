import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { configModuleValidationSchema } from './configs/env-validation.config';

import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { ParentsModule } from './parents/parents.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { NoticesModule } from './notices/notices.module';
import { ExamModule } from './exam/exam.module';
import { GradesModule } from './grades/grades.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UserIdThrottlerGuard } from './auth/guards/userid-throttler.guard';
import { ActionLogsModule } from './action-logs/action-logs.module';
import { TextbookModule } from './textbook/textbook.module';
import { ClassTextbookModule } from './class-textbook/class-textbook.module';
import { HomeworkModule } from './homework/homework.module';
import { ClassModule } from './class/class.module';
import { StudentClassModule } from './student-class/student-class.module';
import { MaterialsModule } from './materials/materials.module';
import { DataSource } from 'typeorm';
import { VideosModule } from './videos/videos.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 120,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: configModuleValidationSchema,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // entities: [__dirname + '/**/*.entity{.ts,.js}'], // 경로를 기반한 엔티티 등록
      synchronize: true,
      autoLoadEntities: true, // 각 모듈에서 등록한 엔티티를 자동으로 등록
      logging: true,
    }),
    AuthModule,
    StudentsModule,
    ParentsModule,
    AdminModule,
    UsersModule,
    NoticesModule,
    ExamModule,
    GradesModule,
    ActionLogsModule,
    TextbookModule,
    ClassTextbookModule,
    HomeworkModule,
    ClassModule,
    StudentClassModule,
    MaterialsModule,
    VideosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: UserIdThrottlerGuard,
    },
  ],
})
export class AppModule {}
