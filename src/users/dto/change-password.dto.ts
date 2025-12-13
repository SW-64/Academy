import { IsNotEmpty, IsStrongPassword } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class ChangePasswordDto {
  /**
   * 기존 비밀번호
   * @example "Example1!"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.COMMON.PASSWORD.REQUIRED })
  currentPassword: string;
  /**
   * 새 비밀번호
   * @example "Example1!"
   */
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    { message: MESSAGES.AUTH.COMMON.PASSWORD.INVALID_FORMAT },
  )
  newPassword: string;

  /**
   * 새 비밀번호 확인
   * @example "Example1!"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.COMMON.PASSWORD.REQUIRED })
  newPasswordConfirm: string;
}
