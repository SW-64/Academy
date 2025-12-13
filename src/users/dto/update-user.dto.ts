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
  @IsOptional({ message: MESSAGES.AUTH.COMMON.NAME.REQUIRED })
  @Length(2, 20, { message: MESSAGES.AUTH.COMMON.NAME.INVALID_LENGTH })
  name: string;

  /**
   * 이메일
   * @example "test@example.com"
   */
  @IsOptional({ message: MESSAGES.AUTH.COMMON.EMAIL.REQUIRED })
  @IsEmail({}, { message: MESSAGES.AUTH.COMMON.EMAIL.INVALID_FORMAT })
  email: string;

  /**
   * 연락처
   * @example "01012345678"
   */
  @IsOptional({ message: MESSAGES.AUTH.COMMON.PHONE.REQUIRED })
  @Matches(/^010\d{8}$/, {
    message: MESSAGES.AUTH.COMMON.PHONE.INVALID_FORMAT,
  })
  phone: string;
}
