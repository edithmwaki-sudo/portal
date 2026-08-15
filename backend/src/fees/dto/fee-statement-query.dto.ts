import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum FeeStatementScope {
  SessionToDate = 'session_to_date',
  PerSession = 'per_session',
  PerYear = 'per_year',
}

export class FeeStatementListQueryDto {
  @IsOptional()
  @IsEnum(FeeStatementScope)
  scope?: FeeStatementScope;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  academicYearId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  academicSessionId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class FeeStatementDetailQueryDto {
  @IsOptional()
  @IsEnum(FeeStatementScope)
  scope?: FeeStatementScope;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  academicYearId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  academicSessionId?: number;
}
