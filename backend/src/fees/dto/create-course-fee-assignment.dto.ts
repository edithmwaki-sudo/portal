import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FeeStatus } from '@prisma/client';

export class CreateCourseFeeAssignmentDto {
  @IsInt()
  courseId: number;

  @IsInt()
  curriculumId: number;

  @IsInt()
  academicYearId: number;

  @IsInt()
  academicSessionId: number;

  @IsInt()
  feeStructureId: number;

  @IsDateString()
  effectiveFrom: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  remarks?: string;

  @IsEnum(FeeStatus)
  @IsOptional()
  status?: FeeStatus;
}
