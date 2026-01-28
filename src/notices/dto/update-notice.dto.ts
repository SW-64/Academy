import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateNoticeDto {
  /**
   * 제목
   * @example "수정한 제목입니다."
   */
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.INVALID_TITLE,
  })
  @MinLength(1, {
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.INVALID_TITLE,
  })
  @MaxLength(100, {
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.INVALID_TITLE,
  })
  title?: string;

  /**
   * 내용
   * @example "수정한 내용입니다."
   */
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.INVALID_CONTENT,
  })
  @MinLength(1, {
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.INVALID_CONTENT,
  })
  @MaxLength(10000, {
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.INVALID_CONTENT,
  })
  content?: string;

  /**
   * 고정여부
   * @example "false"
   */
  @IsOptional()
  @IsBoolean({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.INVALID_PINNED,
  })
  pinned?: boolean;
}
