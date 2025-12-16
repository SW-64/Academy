import { IsOptional } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateNoticeDto {
  /**
   * 제목
   * @example "수정한 제목입니다."
   */
  @IsOptional({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.TITLE_REQUIRED,
  })
  title?: string;

  /**
   * 내용
   * @example "수정한 내용입니다."
   */
  @IsOptional({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.UPDATE.CONTENT_REQUIRED,
  })
  content?: string;

  /**
   * 고정여부
   * @example "false"
   */
  @IsOptional()
  pinned?: boolean;
}
