import { IsEnum, IsOptional, IsString, IsObject, IsInt } from 'class-validator';
import { MESSAGES } from './../../constants/message.constant';
export class CreateLogDto {
  @IsInt({
    message: MESSAGES.ADMIN.ACTION_LOGS.VALIDATION.CREATE.ACTOR_ID_INVALID,
  })
  actorId: number;

  @IsEnum(['user', 'admin'] as const, {
    message: MESSAGES.ADMIN.ACTION_LOGS.VALIDATION.CREATE.ACTOR_TYPE_INVALID,
  })
  actorType: 'user' | 'admin';

  @IsString({
    message: MESSAGES.ADMIN.ACTION_LOGS.VALIDATION.CREATE.ACTION_INVALID,
  })
  action: string;

  @IsOptional()
  @IsEnum(
    ['user', 'admin', 'student', 'parent', 'grade', 'exam', 'notice'] as const,
    {
      message: MESSAGES.ADMIN.ACTION_LOGS.VALIDATION.CREATE.TARGET_TYPE_INVALID,
    },
  )
  targetType?:
    | 'user'
    | 'admin'
    | 'student'
    | 'parent'
    | 'grade'
    | 'exam'
    | 'notice';

  @IsOptional()
  @IsInt({
    message: MESSAGES.ADMIN.ACTION_LOGS.VALIDATION.CREATE.TARGET_ID_INVALID,
  })
  targetId?: number;

  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.ACTION_LOGS.VALIDATION.CREATE.DESCRIPTION_INVALID,
  })
  description?: string;

  @IsOptional()
  @IsObject({
    message: MESSAGES.ADMIN.ACTION_LOGS.VALIDATION.CREATE.CHANGES_INVALID,
  })
  changes?: any;
}
