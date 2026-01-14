import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';
import { Type } from 'class-transformer';

export class UpdateTextbookDto {
  /**
   * 교재 이름
   * @example "미적분 2"
   */
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.NAME_INVALID_FORMAT,
  })
  @MinLength(1)
  name: string;

  /**
   * 교재 학년
   * @example "1학년"
   */
  @IsOptional()
  @IsInt({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.GRADE_INVALID_FORMAT,
  })
  @Min(1)
  grade: number;

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
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.CLASS_ID_INVALID_FORMAT,
  })
  @Min(1, {
    each: true,
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.CLASS_ID_INVALID_FORMAT,
  })
  classList?: number[];
}
