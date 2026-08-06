import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCertificationGradeDto {
  @IsString()
  @Length(1, 50)
  grade: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  gradeStart: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  gradeEnd: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  remark?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
