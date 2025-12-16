import { IsBoolean, IsNotEmpty } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class CreateNoticeDto {
  /**
   * 제목
   * @example "공지사항 제목입니다."
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.TITLE_REQUIRED,
  })
  title: string;

  /**
   * 내용
   * @example "공지사항 내용입니다."
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.NOTICE.VALIDATION.CREATE.CONTENT_REQUIRED,
  })
  content: string;

  /**
   * 고정여부
   * @example "false"
   */
  @IsBoolean({})
  pinned?: boolean;
}
