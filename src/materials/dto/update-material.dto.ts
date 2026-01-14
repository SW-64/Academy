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

export class UpdateMaterialDto {
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.TITLE_INVALID,
  })
  @MinLength(1, {
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.TITLE_INVALID,
  })
  @MaxLength(200, {
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.TITLE_MAX_LENGTH,
  })
  title?: string;

  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.DESC_INVALID,
  })
  @MaxLength(1000, {
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.DESC_MAX_LENGTH,
  })
  description?: string;

  /**
   * (선택) 배포 반 목록을 교체하고 싶을 때만 입력
   */
  @IsOptional()
  @IsArray({
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.CLASS_IDS_INVALID,
  })
  @ArrayNotEmpty({
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.CLASS_IDS_EMPTY,
  })
  @ArrayUnique({
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.CLASS_IDS_DUPLICATED,
  })
  @Type(() => Number)
  @IsInt({
    each: true,
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.CLASS_ID_INVALID,
  })
  @Min(1, {
    each: true,
    message: MESSAGES.ADMIN.MATERIAL.VALIDATION.UPDATE.CLASS_ID_INVALID,
  })
  classIds?: number[];
}
