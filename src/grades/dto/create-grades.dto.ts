import { IsNotEmpty } from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export enum Level {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

export class CreateGradeDto {
  /**
   * 학생아이디
   * @example "2"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.STUDENT_ID_REQUIRED,
  })
  studentId: number;

  /**
   * 점수
   * @example "78"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.SCORE_REQUIRED,
  })
  score: number;

  /**
   * 등급
   * @example "A"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.LEVEL_REQUIRED,
  })
  level: Level;

  /**
   * 코멘트
   * @example "잘했어요"
   */
  @IsNotEmpty({
    message: MESSAGES.ADMIN.GRADE.VALIDATION.CREATE.COMMENT_REQUIRED,
  })
  comment: string;
}
