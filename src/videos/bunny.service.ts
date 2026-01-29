import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { retry } from 'ts-retry-promise';
import { createReadStream, ReadStream } from 'fs';
interface BunnyVideoResponse {
  guid: string;
  title: string;
  dateUploaded: string;
  views: number;
  isPublic: boolean;
  length: number;
  status: number; // 0: Created, 1: Uploaded, 2: Processing, 3: Transcoding, 4: Finished, 5: Resolution Finished
  thumbnailFileName: string;
  availableResolutions: string;
}

@Injectable()
export class BunnyService {
  private readonly apiUrl = 'https://video.bunnycdn.com/library';
  private readonly apiKey: string;
  private readonly libraryId: string;
  private readonly cdnHostname: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BUNNY_API_KEY');
    this.libraryId = this.configService.get<string>('BUNNY_LIBRARY_ID');
    this.cdnHostname = this.configService.get<string>('BUNNY_CDN_HOSTNAME');
  }
  /**
   * 재시도 가능 여부 판단
   */
  private isRetryableError(status: number): boolean {
    // 5xx: 서버 에러 (재시도 가능)
    // 429: Rate Limit (재시도 가능)
    // 408: Request Timeout (재시도 가능)
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * Rate Limit 대기 시간 추출
   */
  private async handleRateLimit(response: Response): Promise<void> {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // 기본 60초

      console.log(`Rate limited. Waiting ${waitTime}ms...`);
      await this.delay(waitTime);
      throw new Error('Rate limited - will retry');
    }
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 1. 영상 메타데이터 생성 (Bunny에 영상 객체 생성)
   */
  async createVideo(title: string): Promise<BunnyVideoResponse> {
    return retry(
      async () => {
        try {
          const response = await fetch(
            `${this.apiUrl}/${this.libraryId}/videos`,
            {
              method: 'POST',
              headers: {
                AccessKey: this.apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ title }),
              signal: AbortSignal.timeout(30000), // 30초 타임아웃
            },
          );

          // Rate Limit 처리
          await this.handleRateLimit(response);

          // 재시도 가능 에러
          if (this.isRetryableError(response.status)) {
            throw new Error(
              `Bunny API error: ${response.status} ${response.statusText}`,
            );
          }

          // 재시도 불가 에러 (4xx)
          if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(
              `Bunny API error: ${response.status} - ${errorText}`,
            );
          }

          return await response.json();
        } catch (error) {
          // AbortSignal timeout
          if (error.name === 'TimeoutError') {
            throw new Error('Request timeout - will retry');
          }

          // BadRequestException은 재시도 안 함
          if (error instanceof BadRequestException) {
            throw error;
          }

          // 기타 네트워크 에러는 재시도
          throw error;
        }
      },
      {
        retries: 3,
        delay: 1000,
        backoff: 'EXPONENTIAL', // 1초, 2초, 4초
        timeout: 90000, // 전체 90초 타임아웃
        logger: (msg) => console.log(`[Bunny Retry] ${msg}`),
      },
    ).catch((error) => {
      console.error('Bunny API Error (all retries failed):', error);
      throw new InternalServerErrorException(
        '영상 생성 중 오류가 발생했습니다.',
      );
    });
  }

  /**
   * 2. 영상 파일 업로드
   */
  /**
   * Stream으로 영상 파일 업로드
   */
  async uploadVideoStream(videoId: string, filePath: string): Promise<void> {
    return retry(
      async () => {
        try {
          const stream = createReadStream(filePath);

          const response = await fetch(
            `${this.apiUrl}/${this.libraryId}/videos/${videoId}`,
            {
              method: 'PUT',
              headers: {
                AccessKey: this.apiKey,
                'Content-Type': 'application/octet-stream',
              },
              // @ts-ignore - Node.js fetch supports stream
              body: stream,
              duplex: 'half',
              signal: AbortSignal.timeout(600000), // 10분
            },
          );

          await this.handleRateLimit(response);

          if (this.isRetryableError(response.status)) {
            throw new Error(`Bunny API error: ${response.status}`);
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(
              `Bunny upload error: ${response.status} - ${errorText}`,
            );
          }

          return await response.json();
        } catch (error) {
          if (error.name === 'TimeoutError') {
            throw new Error('Upload timeout - will retry');
          }
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw error;
        }
      },
      {
        retries: 3,
        delay: 2000,
        backoff: 'EXPONENTIAL',
        timeout: 1800000, // 전체 30분
        logger: (msg) => console.log(`[Bunny Stream Upload Retry] ${msg}`),
      },
    ).catch((error) => {
      console.error('Bunny stream upload failed:', error);
      throw new InternalServerErrorException(
        '영상 업로드 중 오류가 발생했습니다.',
      );
    });
  }
  /**
   * 3. 영상 정보 조회
   */
  async getVideo(videoId: string): Promise<BunnyVideoResponse> {
    return retry(
      async () => {
        try {
          const response = await fetch(
            `${this.apiUrl}/${this.libraryId}/videos/${videoId}`,
            {
              method: 'GET',
              headers: {
                AccessKey: this.apiKey,
              },
              signal: AbortSignal.timeout(10000), // 10초
            },
          );

          await this.handleRateLimit(response);

          if (this.isRetryableError(response.status)) {
            throw new Error(`Bunny API error: ${response.status}`);
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(
              `Bunny get video error: ${response.status} - ${errorText}`,
            );
          }

          return await response.json();
        } catch (error) {
          if (error.name === 'TimeoutError') {
            throw new Error('Get video timeout - will retry');
          }
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw error;
        }
      },
      {
        retries: 3,
        delay: 500,
        backoff: 'EXPONENTIAL',
        timeout: 30000,
      },
    ).catch((error) => {
      console.error('Bunny get video failed:', error);
      throw new InternalServerErrorException(
        '영상 정보 조회 중 오류가 발생했습니다.',
      );
    });
  }

  /**
   * 4. 영상 삭제
   */
  async deleteVideo(videoId: string): Promise<void> {
    return retry(
      async () => {
        try {
          const response = await fetch(
            `${this.apiUrl}/${this.libraryId}/videos/${videoId}`,
            {
              method: 'DELETE',
              headers: {
                AccessKey: this.apiKey,
              },
              signal: AbortSignal.timeout(10000),
            },
          );

          await this.handleRateLimit(response);

          if (this.isRetryableError(response.status)) {
            throw new Error(`Bunny API error: ${response.status}`);
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new BadRequestException(
              `Bunny delete error: ${response.status} - ${errorText}`,
            );
          }
        } catch (error) {
          if (error.name === 'TimeoutError') {
            throw new Error('Delete timeout - will retry');
          }
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw error;
        }
      },
      {
        retries: 3,
        delay: 1000,
        backoff: 'EXPONENTIAL',
        timeout: 30000,
      },
    ).catch((error) => {
      console.error('Bunny delete failed:', error);
      throw new InternalServerErrorException(
        '영상 삭제 중 오류가 발생했습니다.',
      );
    });
  }

  /**
   * 5. 재생 URL 생성
   */
  getPlaybackUrl(videoId: string): string {
    return `https://iframe.mediadelivery.net/embed/${this.libraryId}/${videoId}`;
  }

  /**
   * 6. 썸네일 URL 생성
   */
  getThumbnailUrl(videoId: string, thumbnailFileName?: string): string {
    if (thumbnailFileName) {
      return `https://${this.cdnHostname}/${videoId}/${thumbnailFileName}`;
    }
    // 기본 썸네일 (첫 프레임)
    return `https://${this.cdnHostname}/${videoId}/thumbnail.jpg`;
  }

  /**
   * 7. 영상 상태 확인 (인코딩 완료 여부)
   */
  async isVideoReady(videoId: string): Promise<boolean> {
    const video = await this.getVideo(videoId);
    return video.status === 4; // 4 = Finished
  }
}
