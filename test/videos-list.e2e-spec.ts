import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Videos List E2E - HIGH-1', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    adminToken = process.env.TEST_ADMIN_TOKEN || 'test-admin-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('영상 목록에 assignedStudentCount가 포함되어야 한다', async () => {
    // When
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/videos?page=1&limit=20')
      .set('Authorization', `Bearer ${adminToken}`);

    // Then
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();

    if (res.body.data.length > 0) {
      const firstVideo = res.body.data[0];

      // assignedStudentCount가 존재하고 숫자여야 함
      expect(firstVideo.assignedStudentCount).toBeDefined();
      expect(typeof firstVideo.assignedStudentCount).toBe('number');
      expect(firstVideo.assignedStudentCount).toBeGreaterThanOrEqual(0);
    }
  });
});
