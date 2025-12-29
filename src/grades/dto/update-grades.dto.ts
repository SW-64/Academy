import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateGradeDto {
  /**
   * 시험 점수 (0~100)
   * @example 89
   */
  @IsOptional()
  @IsInt({ message: MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.SCORE_INVALID })
  @Min(0, { message: MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.SCORE_RANGE })
  @Max(100, { message: MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.SCORE_RANGE })
  score?: number;

  /**
   * 코멘트
   * @example "잘했어요"
   */
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.COMMENT_INVALID,
  })
  @MaxLength(500, {
    message: MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.COMMENT_MAX_LENGTH,
  })
  comment?: string;
}
