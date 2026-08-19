import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import {
  CreateStudentDto,
  STUDENT_STATUSES,
} from './create-student.dto';
import type { StudentStatus } from './create-student.dto';

/** Course/authority context is locked on the enrolment once a student is admitted. */
export class UpdateStudentDto extends OmitType(PartialType(CreateStudentDto), [
  'courseId',
  'authorityId',
] as const) {
  /** Management action only — not part of the admission flow. */
  @IsEnum(STUDENT_STATUSES)
  @IsOptional()
  status?: StudentStatus;
}
