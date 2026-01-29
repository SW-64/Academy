import {
  IsString,
  IsArray,
  IsInt,
  MaxLength,
  IsNotEmpty,
  MinLength,
  IsOptional,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateVideoDto {
  /**
   * 영상 이름
   * @example "미적분 2"
   */
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.VIDEO.VALIDATION.UPDATE.INVALID_TITLE,
  })
  @MinLength(1, {
    message: MESSAGES.ADMIN.VIDEO.VALIDATION.UPDATE.INVALID_TITLE,
  })
  @MaxLength(255, {
    message: MESSAGES.ADMIN.VIDEO.VALIDATION.UPDATE.INVALID_TITLE,
  })
  title?: string;

  /**
   * 학생 리스트
   * @example [1,2]
   */
  @IsOptional()
  @IsArray({
    message: MESSAGES.ADMIN.VIDEO.VALIDATION.UPDATE.INVALID_STUDENTS_LIST,
  })
  @Type(() => Number)
  @IsInt({
    each: true,
    message: MESSAGES.ADMIN.VIDEO.VALIDATION.UPDATE.INVALID_STUDENTS_LIST,
  })
  @ArrayMaxSize(100)
  studentIds?: number[]; // 영상을 할당할 학생 ID 배열
}
