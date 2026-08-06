import { IsBoolean, IsInt, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateCertificationLevelDto {
  @IsInt()
  @IsOptional()
  certificationAuthorityId?: number;

  @IsString()
  @Length(1, 50)
  @IsOptional()
  code?: string;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  entryGrade?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
