import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { Role } from '../../users/entities/user.entity';
import { VideosService } from '../../videos/videos.service';

/**
 * 학생/학부모가 해당 영상에 접근 가능한지 확인하는 가드
 * - ADMIN은 모든 영상 접근 가능
 * - STUDENT는 수강 중인 강의의 영상만 접근 가능
 */
@Injectable()
export class VideoAccessGuard implements CanActivate {
  constructor(private videoService: VideosService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const videoId = Number(request.params.videoId);

    // ADMIN은 모든 영상 접근 가능
    if (user.role === Role.ADMIN) {
      return true;
    }

    // STUDENT인 경우
    if (user.role === Role.STUDENT) {
      const canAccess = await this.videoService.canAccessVideo(
        user.userId,
        videoId,
      );

      if (!canAccess) {
        throw new ForbiddenException('해당 영상에 접근할 수 없습니다.');
      }

      return true;
    }
    // ✅ 방어 코드 (실제로는 도달 안 함)
    throw new ForbiddenException('접근 권한이 없습니다.');
  }
}
