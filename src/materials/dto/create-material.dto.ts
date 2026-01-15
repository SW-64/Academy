import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MESSAGES } from '../../constants/message.constant';

export class CreateMaterialDto {
  /**
   * 자료 제목
   * @example "1월 2주차 수학 문제지"
   */
  @IsString({
    message: MESSAGES.ADMIN.MATERIAL?.VALIDATION?.CREATE?.TITLE_INVALID,
  })
  @MinLength(1, {
    message: MESSAGES.ADMIN.MATERIAL?.VALIDATION?.CREATE?.TITLE_INVALID,
  })
  @MaxLength(200, {
    message: MESSAGES.ADMIN.MATERIAL?.VALIDATION?.CREATE?.TITLE_MAX_LENGTH,
  })
  title: string;

  /**
   * 자료 설명(선택)
   * @example "중2 함수 단원"
   */
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.MATERIAL?.VALIDATION?.CREATE?.DESC_INVALID,
  })
  @MaxLength(1000, {
    message: MESSAGES.ADMIN.MATERIAL?.VALIDATION?.CREATE?.DESC_MAX_LENGTH,
  })
  description?: string;

  /**
   * 배포할 반 ID 배열
   * @example [1, 2, 5]
   */
  @IsArray({
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.CREATE.CLASS_IDS_INVALID,
  })
  @ArrayNotEmpty({
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.CREATE.CLASS_IDS_EMPTY,
  })
  @ArrayUnique({
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.CREATE.CLASS_IDS_DUPLICATED,
  })
  @Type(() => Number)
  @IsInt({
    each: true,
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.CREATE.CLASS_ID_INVALID,
  })
  @Min(1, {
    each: true,
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.CREATE.CLASS_ID_INVALID,
  })
  classIds: number[];
}
