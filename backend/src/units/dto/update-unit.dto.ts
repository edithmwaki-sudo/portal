import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export class UpdateUnitDto {
  @IsInt()
  @IsOptional()
  courseId?: number;

  @IsInt()
  @IsOptional()
  curriculumId?: number;

  @IsString()
  @Length(1, 50)
  @IsOptional()
  code?: string;

  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;

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
