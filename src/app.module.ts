import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { ParentsModule } from './parents/parents.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { ExamsModule } from './exams/exams.module';
import { GradesModule } from './grades/grades.module';

@Module({
  imports: [
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
    ExamsModule,
    GradesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
