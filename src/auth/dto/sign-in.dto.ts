import {
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Length,
  Matches,
} from 'class-validator';
import { MESSAGES } from './../../constants/message.constant';
import { Transform } from 'class-transformer';

export class SignInDto {
  /**
   * 아이디 (4-20자, 영문+숫자, 영문 시작)
   * @example "student123"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.LOGIN_ID.REQUIRED })
  @IsString({ message: MESSAGES.AUTH.VALIDATION.LOGIN_ID.INVALID_FORMAT })
  @Length(4, 20, { message: '아이디는 4-20자여야 합니다' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9]*$/, {
    message: '아이디는 영문으로 시작하고 영문, 숫자만 사용 가능합니다',
  })
  @Transform(({ value }) => value?.toLowerCase()) // 대소문자 통일
  loginId: string;

  /**
   * 비밀번호
   * @example "Example1!"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.PASSWORD.REQUIRED })
  @IsStrongPassword(
    { minLength: 8 },
    { message: MESSAGES.AUTH.VALIDATION.PASSWORD.INVALID_FORMAT },
  )
  password: string;
}
