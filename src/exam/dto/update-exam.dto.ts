import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';
import { Type } from 'class-transformer';
import { IsQuestionsPointsMatched } from '../../common/validators/questions-points-match.validator';

export class UpdateExamDto {
  /**
   * 시험이름
   * @example "미적분"
   */
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_INVALID_FORMAT,
  })
  @MinLength(1)
  examTitle?: string;

  /**
   * 시험날짜
   * @example "2025-09-08"
   */
  @IsOptional()
  @IsDateString(
    {},
    { message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_DATE_INVALID_FORMAT },
  )
  examDate?: string;

  /**
   * 문항번호
   * @example "1"
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique(undefined, {
    message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_QUESTION_INVALID_FORMAT,
  }) //배열 안의 값이 중복되지 않는지 검사
  @Type(() => Number) // 바디(JSON)에서 들어오는 값을 Number로 변환
  @IsInt({
    each: true,
    message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_QUESTION_INVALID_FORMAT,
  })
  @Min(1, {
    each: true,
    message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_QUESTION_INVALID_FORMAT,
  })
  question?: number[];

  /**
   * 배점
   * @example "5"
   */
  @IsOptional()
  @IsArray()
  @Type(() => Number) // 바디(JSON)에서 들어오는 값을 Number로 변환
  @IsInt({
    each: true,
    message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_POINTS_INVALID_FORMAT,
  })
  @Min(1, {
    each: true,
    message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_POINTS_INVALID_FORMAT,
  })
  @IsQuestionsPointsMatched({
    message:
      MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE
        .EXAM_QUESTION_POINTS_LENGTH_MISMATCH,
  })
  points?: number[];
}
