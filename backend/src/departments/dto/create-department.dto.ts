import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @Length(1, 50)
  code: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsInt()
  @IsOptional()
  headOfDepartmentId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
