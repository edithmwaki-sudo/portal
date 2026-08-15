import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AdhocChargeType } from '@prisma/client';

export class CreateAdhocLineDto {
  @IsString()
  @Length(1, 255)
  itemName: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000_000)
  amount: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  quantity?: number;
}

export class CreateAdhocInvoiceDto {
  @IsInt()
  studentId: number;

  @IsEnum(AdhocChargeType)
  chargeType: AdhocChargeType;

  @IsOptional()
  @IsInt()
  academicSessionId?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateAdhocLineDto)
  @ArrayMinSize(1)
  items: CreateAdhocLineDto[];
}
