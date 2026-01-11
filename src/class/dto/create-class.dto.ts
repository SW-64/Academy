import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';
import { Type } from 'class-transformer';

export class CreateClassDto {
  /**
   * 반 이름
   * @example "수학반 A"
   */

  @IsNotEmpty({
    message: MESSAGES.ADMIN.CLASS.VALIDATION.CREATE.NAME_REQUIRED,
  })
  @IsString({
    message: MESSAGES.ADMIN.CLASS.VALIDATION.CREATE.NAME_INVALID_FORMAT,
  })
  @MinLength(1)
  name: string;

  /**
   * 학생 ID 배열
   * @example "[1, 2, 3]"
   */

  @IsOptional()
  @IsArray()
  @ArrayUnique() //배열 안의 값이 중복되지 않는지 검사
  @Type(() => Number) // 바디(JSON)에서 들어오는 값을 Number로 변환
  @IsInt({ each: true }) // 배열의 각 요소가 정수인지 검사.
  @Min(1, { each: true }) // 배열의 각 요소가 최소 1 이상인지 검사
  studentIds?: number[];
}
