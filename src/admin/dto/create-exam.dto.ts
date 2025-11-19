import { IsNotEmpty } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class CreateExamDto {
  /**
   * 해당년도
   * @example "2024"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.EXAM.CREATE.YEAR })
  year: number;

  /**
   * 학기
   * @example "2"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.EXAM.CREATE.SEMESTER })
  semester: number;

  /**
   * 시험날짜
   * @example "09.08"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.EXAM.CREATE.EXAM_DATE })
  exam_date: Date;
}
