import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Video } from '../src/videos/entities/video.entity';
import { StudentVideo } from '../src/videos/entities/student-video.entity';

describe('Videos Delete E2E - CRITICAL-2', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    adminToken = process.env.TEST_ADMIN_TOKEN || 'test-admin-token';
    studentToken = process.env.TEST_STUDENT_TOKEN || 'test-student-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('영상 삭제 시 StudentVideo도 함께 삭제되어야 한다', async () => {
    // Given: 영상 생성 (테스트 데이터 준비)
    // 실제로는 시드 데이터를 사용하거나 별도로 생성
    const testVideoId = 1; // 테스트용 영상 ID

    // When: 영상 삭제
    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/v1/admin/videos/${testVideoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 204]).toContain(deleteRes.status);

    // Then: DB 확인
    const studentVideoRepo = dataSource.getRepository(StudentVideo);
    const count = await studentVideoRepo.count({
      where: { videoId: testVideoId },
    });

    // StudentVideo가 삭제되었어야 함
    expect(count).toBe(0);

    // Video는 soft delete되어 있어야 함
    const videoRepo = dataSource.getRepository(Video);
    const video = await videoRepo.findOne({
      where: { videoId: testVideoId },
      withDeleted: true,
    });

    expect(video?.deletedAt).not.toBeNull();
  });

  it('삭제된 영상은 학생 목록에 노출되지 않아야 한다', async () => {
    // Given: 영상 삭제 (위 테스트와 연계)
    const testVideoId = 1;

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/videos/${testVideoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // When: 학생이 영상 목록 조회
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/students/me/videos')
      .set('Authorization', `Bearer ${studentToken}`);

    // Then
    expect(listRes.status).toBe(200);

    const videoIds = (listRes.body?.data ?? []).map((v: any) => v.videoId);
    expect(videoIds).not.toContain(testVideoId);
  });
});
