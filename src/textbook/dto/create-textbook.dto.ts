import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';
import { Type } from 'class-transformer';

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

  // 대단원별 소단원 개수
  // 예: [2, 1, 1] => 1대단원 2개, 2대단원 1개, 3대단원 1개
  @IsOptional()
  @IsArray()
  @IsInt({
    each: true,
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.CREATE.UNITS_INVALID_FORMAT,
  })
  @Min(1, {
    each: true,
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.CREATE.UNITS_INVALID_FORMAT,
  })
  units: number[];

  /**
   * 클래스 목록
   *
   */

  @IsOptional()
  @IsArray()
  @ArrayUnique({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.CLASS_ID_DUPLICATED,
  })
  @Type(() => Number) // 바디(JSON)에서 들어오는 값을 Number로 변환
  @IsInt({
    each: true,
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.CREATE.CLASS_ID_INVALID_FORMAT,
  })
  @Min(1, {
    each: true,
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.CREATE.CLASS_ID_INVALID_FORMAT,
  })
  classList?: number[];
}
