import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class UpdateDepartmentDto {
  @IsString()
  @Length(1, 50)
  @IsOptional()
  code?: string;

  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  headOfDepartmentId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
