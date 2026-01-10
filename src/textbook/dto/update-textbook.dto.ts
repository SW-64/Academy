import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { MESSAGES } from '../../constants/message.constant';

export class UpdateTextbookDto {
  /**
   * 교재 이름
   * @example "미적분 2"
   */
  @IsOptional()
  @IsString({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.NAME_INVALID_FORMAT,
  })
  @MinLength(1)
  name: string;

  /**
   * 교재 학년
   * @example "1학년"
   */
  @IsOptional()
  @IsInt({
    message: MESSAGES.ADMIN.TEXTBOOK.VALIDATION.UPDATE.GRADE_INVALID_FORMAT,
  })
  @Min(1)
  grade: number;
}
