import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class CreateExamDto {
  /**
   * 해당년도
   * @example "2024"
   */

  @IsInt({ message: MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.YEAR_INVALID_FORMAT })
  @Min(2000)
  year: number;

  /**
   * 시험이름
   * @example "미적분"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.EXAM_TITLE_REQUIRED,
  })
  @IsString({
    message: MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.EXAM_INVALID_FORMAT,
  })
  @MinLength(1)
  examTitle: string;

  /**
   * 시험날짜
   * @example "2025-09-08"
   */
  @IsDateString(
    {},
    { message: MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.EXAM_DATE_REQUIRED },
  )
  examDate: string;
}
