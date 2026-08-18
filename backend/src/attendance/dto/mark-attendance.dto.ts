import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class MarkAttendanceDto {
  @IsInt()
  unitId: number;

  @IsInt()
  @IsOptional()
  trainerProfileId?: number;

  @IsDateString()
  sessionDate: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5)
  startTime: string;

  @IsArray()
  @IsInt({ each: true })
  studentProfileIds: number[];

  @IsIn(['present', 'absent', 'late', 'excused'])
  status: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  remarks?: string;
}
