import { IsOptional } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateExamDto {
  /**
   * 해당년도
   * @example "2024"
   */
  @IsOptional({ message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.YEAR_REQUIRED })
  year: number;

  /**
   * 시험이름
   * @example "미적분"
   */
  @IsOptional({
    message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_TITLE_REQUIRED,
  })
  exam_title: string;

  /**
   * 시험날짜
   * @example "10.12"
   */
  @IsOptional({
    message: MESSAGES.ADMIN.EXAM.VALIDATION.UPDATE.EXAM_DATE_REQUIRED,
  })
  exam_date: Date;

  /**
   * 학생평균
   * @example "86.5"
   */
  @IsOptional({
    message: MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.STUDENT_AVERAGE_REQUIRED,
  })
  student_average: number;
}
