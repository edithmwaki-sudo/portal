import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { FeeStatus } from '@prisma/client';
import { UpdateFeeItemDto } from './update-fee-item.dto';

export class UpdateFeeStructureDto {
  @IsString()
  @Length(1, 255)
  @IsOptional()
  feeName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(FeeStatus)
  @IsOptional()
  status?: FeeStatus;

  /** When present, replaces the entire item list of the structure. */
  @ValidateNested({ each: true })
  @Type(() => UpdateFeeItemDto)
  @ArrayMinSize(1)
  items?: UpdateFeeItemDto[];
}
