import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';
import { Type } from 'class-transformer';

export class CreateNoticeDto {
  /**
   * 제목
   * @example "공지사항 제목입니다."
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.TITLE_REQUIRED,
  })
  @IsString({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.INVALID_TITLE,
  })
  @MinLength(1, {
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.INVALID_TITLE,
  })
  @MaxLength(100, {
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.INVALID_TITLE,
  })
  title: string;

  /**
   * 내용
   * @example "공지사항 내용입니다."
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.CONTENT_REQUIRED,
  })
  @IsString({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.INVALID_CONTENT,
  })
  @MinLength(1, {
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.INVALID_CONTENT,
  })
  @MaxLength(10000, {
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.INVALID_CONTENT,
  })
  content: string;

  /**
   * 고정여부
   * @example "false"
   */

  @IsOptional()
  @IsBoolean({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.INVALID_PINNED,
  })
  pinned?: boolean;
}
