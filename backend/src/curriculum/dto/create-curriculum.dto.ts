import { IsInt, IsString, Length } from 'class-validator';

export class CreateCurriculumDto {
  @IsInt()
  certificationAuthorityId: number;

  @IsString()
  @Length(1, 100)
  cycleName: string;
}
