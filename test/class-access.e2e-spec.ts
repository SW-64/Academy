import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('ClassAccessGuard E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /class/:classId/textbooks', () => {
    it('ADMIN은 모든 반의 교재 목록 조회 가능', async () => {
      const adminToken = process.env.E2E_ADMIN_TOKEN as string;

      await request(app.getHttpServer())
        .get('/class/1/textbooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('STUDENT는 본인 반만 조회 가능', async () => {
      const studentToken = process.env.E2E_STUDENT_TOKEN as string;

      // 본인 반 (classId=1)
      await request(app.getHttpServer())
        .get('/class/1/textbooks')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // 다른 반 (classId=2)
      await request(app.getHttpServer())
        .get('/class/2/textbooks')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('PARENT는 자녀 반만 조회 가능', async () => {
      const parentToken = process.env.E2E_PARENT_TOKEN as string;

      // 자녀 반 (classId=1)
      await request(app.getHttpServer())
        .get('/class/1/textbooks')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      // 다른 반 (classId=3)
      await request(app.getHttpServer())
        .get('/class/3/textbooks')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });

    it('인증 없이 접근 시 401', async () => {
      await request(app.getHttpServer()).get('/class/1/textbooks').expect(401);
    });
  });
});
