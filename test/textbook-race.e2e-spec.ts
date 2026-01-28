// test/textbook-race.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CRITICAL-1 E2E: concurrent POST /textbooks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('동시 2요청에서 Duplicate entry로 500이 터지지 않아야 한다', async () => {
    const server = app.getHttpServer();

    const payload = {
      name: '중2 함수',
      grade: 2,
      classList: [1, 2],
      units: [2, 1, 1],
    };

    const [r1, r2] = await Promise.all([
      request(server).post('/textbooks').send(payload),
      request(server).post('/textbooks').send(payload),
    ]);

    expect([200, 201, 409]).toContain(r1.status);
    expect([200, 201, 409]).toContain(r2.status);

    expect(JSON.stringify(r1.body)).not.toMatch(/Duplicate entry/i);
    expect(JSON.stringify(r2.body)).not.toMatch(/Duplicate entry/i);
  });
});
