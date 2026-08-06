import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @Length(1, 50)
  code: string;

  @IsString()
  @Length(1, 20)
  initials: string;

  @IsString()
  @Length(1, 255)
  name: string;

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
  certificationAuthorityId: number;

  @IsInt()
  certificationLevelId: number;

  @IsInt()
  departmentId: number;

  /** Curriculum version assigned at registration — creates the course_curricula mapping. */
  @IsInt()
  curriculumId: number;
}
