import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';
import { Level } from '../entities/grade.entity';

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
  @IsInt({ message: MESSAGES.ADMIN.GRADE.CREATE.STUDENTID })
  @Min(1, { message: MESSAGES.ADMIN.GRADE.CREATE.STUDENTID })
  studentId: number;

  /**
   * 시험 점수
   * @example "78"
   */
  @IsInt({ message: MESSAGES.ADMIN.GRADE.CREATE.SCORE })
  @Min(0, { message: MESSAGES.ADMIN.GRADE.CREATE.SCORE })
  @Max(100, { message: MESSAGES.ADMIN.GRADE.CREATE.SCORE })
  score: number;

  /**
   * 코멘트
   * @example "잘했어요"
   */
  @IsOptional()
  @IsString({ message: MESSAGES.ADMIN.GRADE.CREATE.COMMENT })
  @MaxLength(500, { message: MESSAGES.ADMIN.GRADE.CREATE.COMMENT })
  comment?: string;
}
