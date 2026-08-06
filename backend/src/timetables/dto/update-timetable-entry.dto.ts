import { PartialType } from '@nestjs/mapped-types';
import { CreateTimetableEntryDto } from './create-timetable-entry.dto';

export class UpdateTimetableEntryDto extends PartialType(
  CreateTimetableEntryDto,
) {}
