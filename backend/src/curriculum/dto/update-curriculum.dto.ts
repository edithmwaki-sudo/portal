import { IsInt, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCurriculumDto {
  @IsInt()
  @IsOptional()
  certificationAuthorityId?: number;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  cycleName?: string;
}
