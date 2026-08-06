import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCourseDto {
  @IsString()
  @Length(1, 50)
  @IsOptional()
  code?: string;

  @IsString()
  @Length(1, 20)
  @IsOptional()
  initials?: string;

  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMonths?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  certificationAuthorityId?: number;

  @IsInt()
  @IsOptional()
  certificationLevelId?: number;

  @IsInt()
  @IsOptional()
  departmentId?: number;
}
