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

export class UpdateCertificationGradeDto {
  @IsString()
  @Length(1, 50)
  @IsOptional()
  grade?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  gradeStart?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  gradeEnd?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  remark?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
