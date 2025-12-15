import { IsOptional } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export enum Level {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

export class UpdateGradeDto {
  /**
   * 학생아이디
   * @example "2"
   */
  @IsOptional({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.STUDENT_ID_REQUIRED,
  })
  studentId: number;

  /**
   * 점수
   * @example "78"
   */
  @IsOptional({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.SCORE_REQUIRED,
  })
  score: number;

  /**
   * 등급
   * @example "A"
   */
  @IsOptional({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.LEVEL_REQUIRED,
  })
  level: Level;

  /**
   * 코멘트
   * @example "잘했어요"
   */
  @IsOptional({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.UPDATE.COMMENT_REQUIRED,
  })
  comment: string;
}
