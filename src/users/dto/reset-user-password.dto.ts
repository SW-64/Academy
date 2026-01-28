import { IsNotEmpty, IsStrongPassword } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';
import { Match } from '../../common/validators/match.decorator';

export class ResetUserPasswordDto {
  /**
   * 새 비밀번호
   * @example "Example1!"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.PASSWORD.NEW_REQUIRED })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    { message: MESSAGES.AUTH.VALIDATION.PASSWORD.INVALID_FORMAT },
  )
  newPassword: string;

  /**
   * 새 비밀번호 확인
   * @example "Example1!"
   */
  @IsNotEmpty({
    message: MESSAGES.AUTH.VALIDATION.PASSWORD_CONFIRM.NEW_REQUIRED,
  })
  @Match('newPassword', {
    message: MESSAGES.USER.ERROR.VALIDATION.PASSWORD_CONFIRM_NOT_MATCH,
  })
  newPasswordConfirm: string;
}
