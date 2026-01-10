import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class CreateTextbookDto {
  /**
   * 교재 이름
   * @example "미적분 2"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.CREATE.NAME_REQUIRED,
  })
  name: string;

  /**
   * 교재 학년
   * @example "1"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.CREATE.GRADE_REQUIRED,
  })
  grade: number;

  /**
   * 대단원 개수
   * @example "5"
   */

  @IsNotEmpty({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.CREATE.LARGE_UNIT_REQUIRED,
  })
  largeUnit: number;

  /**
   * 소단원 개수
   * @example "5"
   */

  @IsNotEmpty({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.CREATE.SMALL_UNIT_REQUIRED,
  })
  smallUnit: number;
}
