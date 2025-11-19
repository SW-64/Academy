import { IsOptional } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateExamDto {
  /**
   * 해당년도
   * @example "2024"
   */
  @IsOptional({ message: MESSAGES.ADMIN.EXAM.UPDATE.YEAR })
  year: number;

  /**
   * 학기
   * @example "2"
   */
  @IsOptional({ message: MESSAGES.ADMIN.EXAM.UPDATE.SEMESTER })
  semester: number;

  /**
   * 시험날짜
   * @example "10.12"
   */
  @IsOptional({ message: MESSAGES.ADMIN.EXAM.UPDATE.EXAM_DATE })
  exam_date: Date;
}
