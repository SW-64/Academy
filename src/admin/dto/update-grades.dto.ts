import { IsOptional } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateGradeDto {
  /**
   * 학생아이디
   * @example "24"
   */
  @IsOptional({ message: MESSAGES.ADMIN.GRADE.UPDATE.STUDENTID })
  studentId: number;

  /**
   * 시험 과목
   * @example "공통수학"
   */
  @IsOptional({ message: MESSAGES.ADMIN.GRADE.UPDATE.SUBJECT })
  subject: string;

  /**
   * 시험 점수
   * @example "89"
   */
  @IsOptional({ message: MESSAGES.ADMIN.GRADE.UPDATE.SCORE })
  score: number;
}
