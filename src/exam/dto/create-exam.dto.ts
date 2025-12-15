import { IsDateString, IsNotEmpty } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class CreateExamDto {
  /**
   * 해당년도
   * @example "2024"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.EXAM.CREATE.YEAR })
  year: number;

  /**
   * 시험명
   * @example "2학기"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.EXAM.CREATE.EXAM_TITLE })
  exam_title: string;

  /**
   * 시험날짜
   * @example "09.08"
   */
  @IsDateString({}, { message: MESSAGES.ADMIN.EXAM.CREATE.EXAM_DATE })
  exam_date: string;
}
