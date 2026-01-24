import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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
  @MaxLength(255, {
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.NAME_INVALID_FORMAT,
  })
  name?: string;

  /**
   * 교재 학년
   * @example "1학년"
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.GRADE_INVALID_FORMAT,
  })
  @Min(1)
  @Max(3)
  grade?: number;

  // 대단원별 소단원 개수
  @IsOptional()
  @Type(() => Number)
  @IsArray({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.UNITS_INVALID_FORMAT,
  })
  @ArrayMinSize(1, {
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.UNITS_INVALID_FORMAT,
  })
  @IsInt({
    each: true,
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.UNITS_INVALID_FORMAT,
  })
  @Min(1, {
    each: true,
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.UNITS_INVALID_FORMAT,
  })
  @ArrayMaxSize(100)
  units?: number[];

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
