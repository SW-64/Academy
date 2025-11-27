import { IsNotEmpty } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class CreateGradeDto {
  /**
   * 학생아이디
   * @example "2"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.GRADE.CREATE.STUDENTID })
  studentId: number;

  /**
   * 시험 과목
   * @example "미적분"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.GRADE.CREATE.SUBJECT })
  subject: string;

  /**
   * 시험 점수
   * @example "78"
   */
  @IsNotEmpty({ message: MESSAGES.ADMIN.GRADE.CREATE.SCORE })
  score: number;
}
