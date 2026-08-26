import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Gender } from '@prisma/client';

export const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'GRADUATED'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const NEXT_OF_KIN_RELATIONSHIPS = [
  'Partner',
  'Sibling',
  'Father',
  'Mother',
  'Relative',
  'Guardian',
] as const;
export type NextOfKinRelationship = (typeof NEXT_OF_KIN_RELATIONSHIPS)[number];

export class CreateStudentDto {
  // Account — username (admission number) and default password are generated
  // server-side; the admission number doubles as the student's login identifier.
  @IsEmail()
  @Length(3, 255)
  email: string;

  @IsString()
  @Length(1, 255)
  firstName: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  middleName?: string;

  @IsString()
  @Length(1, 255)
  lastName: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  nationality?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  nationalId?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  placeOfBirth?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  religion?: string;

  /** Also the student's default (one-time) login password. */
  @IsString()
  @Length(1, 50)
  phone: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  alternativePhoneNumber?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  county?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  address?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  city?: string;

  @IsString()
  @IsOptional()
  @Length(0, 20)
  postalCode?: string;

  @IsBoolean()
  @IsOptional()
  isPwd?: boolean;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  disabilityType?: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  disabilityDescription?: string;

  // Next of kin
  @IsString()
  @IsOptional()
  @Length(0, 100)
  nextOfKinFirstName?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  nextOfKinLastName?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  nextOfKinPhone?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  nextOfKinAltPhone?: string;

  @IsEmail()
  @IsOptional()
  @Length(0, 255)
  nextOfKinEmail?: string;

  @IsString()
  @IsOptional()
  @IsIn(NEXT_OF_KIN_RELATIONSHIPS)
  nextOfKinRelationship?: NextOfKinRelationship;

  // Admission — cascade: Authority → Level → Curriculum → CourseCurriculum
  /** Filter only — certification authority for UI cascade. */
  @IsInt()
  @IsOptional()
  authorityId?: number;

  /** Filter only — certification level for UI cascade. */
  @IsInt()
  @IsOptional()
  levelId?: number;

  /** Filter only — curriculum (cycle) for UI cascade. */
  @IsInt()
  @IsOptional()
  curriculumId?: number;

  /** Required — the actual course curriculum to enrol into. */
  @IsInt()
  courseCurriculumId: number;

  /** Year of entry (1-6) — independent of certification level. */
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(6)
  level?: number;

  @IsDateString()
  @IsOptional()
  admDate?: string;
}
