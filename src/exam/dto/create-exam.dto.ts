import { IsNotEmpty } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class CreateExamDto {
  /**
   * 해당년도
   * @example "2024"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.YEAR_REQUIRED })
  year: number;

  /**
   * 시험이름
   * @example "미적분"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.EXAM_TITLE_REQUIRED,
  })
  exam_title: string;

  /**
   * 시험날짜
   * @example "09.08"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.EXAM_DATE_REQUIRED,
  })
  exam_date: Date;

  /**
   * 학생평균
   * @example "86.5"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.EXAM.VALIDATION.CREATE.STUDENT_AVERAGE_REQUIRED,
  })
  student_average: number;
}
