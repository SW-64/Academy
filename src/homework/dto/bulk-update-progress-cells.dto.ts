import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProgressCellPatchItemDto {
  @IsInt()
  studentId!: number;

  @IsInt()
  chapterId!: number; // textbook_chapter_id

  @IsInt()
  @Min(0)
  @Max(100)
  percent!: number;
}

export class BulkUpdateProgressCellsDto {
  @IsArray()
  @ArrayMaxSize(500) // 운영에서 안전장치(원하면 조정)
  @ValidateNested({ each: true })
  @Type(() => ProgressCellPatchItemDto)
  items!: ProgressCellPatchItemDto[];
}
