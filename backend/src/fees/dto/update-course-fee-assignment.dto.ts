import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FeeStatus } from '@prisma/client';

export class UpdateCourseFeeAssignmentDto {
  @IsInt()
  @IsOptional()
  feeStructureId?: number;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

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
