import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateNoticeDto {
  /**
   * 제목
   * @example "수정한 제목입니다."
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  /**
   * 내용
   * @example "수정한 내용입니다."
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  /**
   * 고정여부
   * @example "false"
   */
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}
