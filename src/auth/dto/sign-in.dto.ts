import { IsEmail, IsNotEmpty, IsStrongPassword } from 'class-validator';
import { MESSAGES } from './../../constants/message.constant';

export class SignInDto {
  /**
   * 이메일
   * @example "test@example.com"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.EMAIL.REQUIRED })
  @IsEmail({}, { message: MESSAGES.AUTH.VALIDATION.EMAIL.INVALID_FORMAT })
  email: string;

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
