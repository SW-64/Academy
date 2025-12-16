import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class CreateGradeDto {
  /**
   * 학생아이디
   * @example "2"
   */
  @IsInt({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.STUDENT_ID_INVALID,
  })
  @Min(1, {
    message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.STUDENT_ID_INVALID,
  })
  studentId: number;

  /**
   * 시험 점수
   * @example "78"
   */
  @IsInt({ message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.SCORE_INVALID })
  @Min(0, { message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.SCORE_RANGE })
  @Max(100, { message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.SCORE_RANGE })
  score: number;

  /**
   * 코멘트
   * @example "잘했어요"
   */
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.COMMENT_INVALID,
  })
  @MaxLength(500, {
    message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.COMMENT_MAX_LENGTH,
  })
  comment?: string;
}
