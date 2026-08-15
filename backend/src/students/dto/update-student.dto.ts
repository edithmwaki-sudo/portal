import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from './create-student.dto';

/** Course/curriculum context is locked on the enrolment once a student is admitted. */
export class UpdateStudentDto extends OmitType(PartialType(CreateStudentDto), [
  'courseId',
  'curriculumId',
] as const) {}
