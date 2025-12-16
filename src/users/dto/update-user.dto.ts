import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { MESSAGES } from './../../constants/message.constant';

export class UpdateUserDto {
  /**
   * 이름
   * @example "홍길동"
   */
  @IsOptional()
  @Length(2, 20, { message: MESSAGES.AUTH.VALIDATION.NAME.INVALID_LENGTH })
  name?: string;

  /**
   * 이메일
   * @example "test@example.com"
   */
  @IsOptional()
  @IsEmail({}, { message: MESSAGES.AUTH.VALIDATION.EMAIL.INVALID_FORMAT })
  email?: string;

  /**
   * 연락처
   * @example "01012345678"
   */
  @IsOptional()
  @Matches(/^010\d{8}$/, {
    message: MESSAGES.AUTH.VALIDATION.PHONE.INVALID_FORMAT,
  })
  phone?: string;
}
