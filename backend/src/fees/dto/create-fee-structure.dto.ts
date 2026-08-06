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
import { CreateFeeItemDto } from './fee-item.dto';

export class CreateFeeStructureDto {
  @IsString()
  @Length(1, 255)
  feeName: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(FeeStatus)
  @IsOptional()
  status?: FeeStatus;

  @ValidateNested({ each: true })
  @Type(() => CreateFeeItemDto)
  @ArrayMinSize(1)
  items: CreateFeeItemDto[];
}
