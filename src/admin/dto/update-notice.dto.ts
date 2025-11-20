import { IsOptional } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateNoticeDto {
  /**
   * 제목
   * @example "수정한 제목입니다."
   */
  @IsOptional({ message: MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.TITLE })
  title: string;

  /**
   * 내용
   * @example "수정한 내용입니다."
   */
  @IsOptional({ message: MESSAGES.ADMIN.NOTICE.COMMON.UPDATE.CONTENT })
  content: string;
}
