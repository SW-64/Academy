import {
  IsNotEmpty,
  IsEmail,
  Length,
  IsStrongPassword,
  IsEnum,
  Matches,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { MESSAGES } from './../../constants/message.constant';
import { Role } from '../../users/entities/user.entity';

export class SignUpDto {
  /**
   * 이름
   * @example "홍길동"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.NAME.REQUIRED })
  @Length(2, 20, { message: MESSAGES.AUTH.VALIDATION.NAME.INVALID_LENGTH })
  name: string;

  /**
   * 이메일
   * @example "test@example.com"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.EMAIL.REQUIRED })
  @IsEmail({}, { message: MESSAGES.AUTH.VALIDATION.EMAIL.INVALID_FORMAT })
  email: string;

  /**
   * 역할
   * @example "STUDENT"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.ROLE.REQUIRED })
  @IsEnum([Role.PARENT, Role.STUDENT] as const, {
    message: MESSAGES.AUTH.VALIDATION.ROLE.INVALID,
  })
  role: Role;

  /**
   * 연락처
   * @example "01012345678"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.PHONE.REQUIRED })
  @Matches(/^010\d{8}$/, {
    message: MESSAGES.AUTH.VALIDATION.PHONE.INVALID_FORMAT,
  })
  phone: string;
  /**
   * 비밀번호
   * @example "Example1!"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.PASSWORD.REQUIRED })
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
  password: string;

  /**
   * 비밀번호 확인
   * @example "Example1!"
   */
  @IsNotEmpty({ message: MESSAGES.AUTH.VALIDATION.PASSWORD_CONFIRM.REQUIRED })
  passwordConfirm: string;

  /**
   * 임시 학교
   * @example "서울대학교"
   */
  @IsOptional()
  @IsString()
  signupSchool?: string;

  /**
   * 임시 학년
   * @example 3
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  signupGrade?: number;
}
