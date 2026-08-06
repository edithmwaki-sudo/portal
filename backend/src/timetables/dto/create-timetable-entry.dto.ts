import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateTimetableEntryDto {
  @IsInt()
  academicSessionId: number;

  @IsInt()
  unitId: number;

  @IsInt()
  @IsOptional()
  trainerStaffId?: number;

  @IsInt()
  @IsOptional()
  lectureRoomId?: number;

  @IsInt()
  @Min(0)
  dayOfWeek: number;

  @IsString()
  @Matches(TIME_RE, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @IsString()
  @Matches(TIME_RE, { message: 'endTime must be in HH:mm format' })
  endTime: string;

  @IsString()
  @IsOptional()
  @Length(1, 30)
  type?: string;

  @IsString()
  @IsOptional()
  @Length(1, 30)
  recurrence?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
