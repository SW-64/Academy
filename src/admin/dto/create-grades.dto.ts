import { IsNotEmpty } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class CreateGradeDto {
  /**
   * 해당년도
   * @example "2"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.EXAM.CREATE.YEAR })
  studentId: number;

  /**
   * 학기
   * @example "미적분"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.EXAM.CREATE.SEMESTER })
  subject: string;

  /**
   * 시험날짜
   * @example "78"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.EXAM.CREATE.EXAM_DATE })
  score: number;
}
