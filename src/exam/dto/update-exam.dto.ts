import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateExamDto {
  /**
   * 해당년도
   * @example "2024"
   */
  @IsOptional()
  @IsInt({ message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.YEAR_INVALID_FORMAT })
  @Min(2000)
  year?: number;

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
   * @example "10.12"
   */
  @IsOptional()
  @IsDateString(
    {},
    { message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_DATE_REQUIRED },
  )
  examDate?: string;

  /**
   * 학생평균
   * @example "86.5"
   */
  @IsOptional()
  studentAverage?: number;
}
