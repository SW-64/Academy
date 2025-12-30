import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserIdThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // 로그인된 요청만 userId 기준으로 제한
    // (로그인 전 엔드포인트는 req.user가 없으니 IP로 fallback)
    return req.user?.userId ? `uid:${req.user.userId}` : `ip:${req.ip}`;
  }
}
