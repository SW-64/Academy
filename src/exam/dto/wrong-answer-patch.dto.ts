import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export class WrongAnswersUpsertItemDto {
  @IsInt()
  @Min(1)
  studentId!: number;

  @IsArray()
  @ArrayMaxSize(300) // 학생 1명이 틀릴 수 있는 문항 수 안전장치
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  wrongExamDetailIds!: number[];
}

export class ReplaceWrongAnswersDto {
  @IsArray()
  @ArrayMaxSize(200) // 한 번에 수정하는 학생 수 제한(상황에 맞게 조정)
  @ValidateNested({ each: true })
  @Type(() => WrongAnswersUpsertItemDto)
  items!: WrongAnswersUpsertItemDto[];
}
