import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUnitDto {
  @IsInt()
  courseId: number;

  @IsInt()
  curriculumId: number;

  @IsString()
  @Length(1, 50)
  code: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(99)
  @IsOptional()
  modulesTaught?: number;

  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  taughtHours?: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  creditFactor?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
