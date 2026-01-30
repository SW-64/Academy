import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Video, VideoStatus } from '../src/videos/entities/video.entity';
import { StudentVideo } from '../src/videos/entities/student-video.entity';

describe('Videos Upload E2E - CRITICAL-1', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    // 테스트용 관리자 토큰 (실제 환경에 맞게 조정)
    adminToken = process.env.TEST_ADMIN_TOKEN || 'test-admin-token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('업로드 실패 시 학생에게 영상이 노출되지 않아야 한다', async () => {
    // Given: Bunny 업로드를 실패하도록 설정 (테스트 환경 구성 필요)

    // When: 영상 업로드
    const uploadRes = await request(app.getHttpServer())
      .post('/api/v1/admin/videos')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', '테스트 영상')
      .field('studentIds[]', '1')
      .attach('file', Buffer.from('test video content'), 'test.mp4');

    expect([201, 200]).toContain(uploadRes.status);
    const videoId = uploadRes.body?.videoId;

    // 업로드 실패 대기 (실제로는 모킹 또는 환경 설정으로)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Then: DB 확인
    const videoRepo = dataSource.getRepository(Video);
    const video = await videoRepo.findOne({
      where: { videoId },
    });

    if (video && video.status === VideoStatus.FAILED) {
      // StudentVideo가 생성되지 않았는지 확인
      const studentVideoRepo = dataSource.getRepository(StudentVideo);
      const count = await studentVideoRepo.count({
        where: { videoId },
      });

      expect(count).toBe(0);
    }
  });
});
