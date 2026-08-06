import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLectureRoomDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 50)
  code: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  capacity?: number;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
