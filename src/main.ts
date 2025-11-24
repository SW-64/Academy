import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AllExceptionsFilter } from './all-execption.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());

  // XSS, 클릭재킹 공격방어
  app.use(helmet());

  // CORS 설정 ( 프론트와 백엔드 간 통신 허용 )
  app.enableCors({
    origin: true, // 요청한 Orign(도메인)을 그대로 허용 -> 운영에서는 반드시 특정도메인으로 변경
    credentials: true, // 쿠키/세션/JWT-With-Credentials 요청을 허용한다는 의미.
  });

  app.enableShutdownHooks();
  const port = configService.get<number>('SERVER_PORT') || 3001;

  // 글로벌 Prefix 설정
  app.setGlobalPrefix('api/v1', {
    exclude: ['health-check'], // 헬스체크는 prefix 제외
  });
  // 글로벌 파이프라인 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 필드 자동 제거
      forbidNonWhitelisted: false, // whitelist에서 제거되는 필드를 에러로 처리할지 말지 결정.
      transform: true, // string → number 자동 변환
      transformOptions: {
        enableImplicitConversion: true, // DTO에서 명시적으로 타입 변환 데코레이터를 사용하지 않아도 기본 타입 변환을 활성화
      },
    }),
  );
  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }) // Swagger에서 JWT 토큰을 넣고 모든 API 테스트 가능
    .addServer('/api/v1') // 글로벌 prefix(/api/v1)가 Swagger 문서에 반영됨
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc, {
    swaggerOptions: {
      persistAuthorization: true, // 페이지 새로고침 시 인증 유지
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  app.useGlobalFilters(new AllExceptionsFilter()); // 에러 문 처리
  await app.listen(port, '0.0.0.0');
  console.log('Server URL:', await app.getUrl()); // 서버 URL 콘솔 출력
}
bootstrap();
