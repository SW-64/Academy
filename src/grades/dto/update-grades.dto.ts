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
   * 학생아이디
   * @example 24
   */
  @IsOptional()
  @IsInt({ message: MESSAGES.ADMIN.GRADE.UPDATE.STUDENTID })
  @Min(1, { message: MESSAGES.ADMIN.GRADE.UPDATE.STUDENTID })
  studentId?: number;

  /**
   * 시험 점수 (0~100)
   * @example 89
   */
  @IsOptional()
  @IsInt({ message: MESSAGES.ADMIN.GRADE.UPDATE.SCORE })
  @Min(0, { message: MESSAGES.ADMIN.GRADE.UPDATE.SCORE })
  @Max(100, { message: MESSAGES.ADMIN.GRADE.UPDATE.SCORE })
  score?: number;

  /**
   * 코멘트
   * @example "잘했어요"
   */
  @IsOptional()
  @IsString({ message: MESSAGES.ADMIN.GRADE.CREATE.COMMENT })
  @MaxLength(500, { message: MESSAGES.ADMIN.GRADE.CREATE.COMMENT })
  comment?: string;
}
