import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export const GENDERS = ['male', 'female', 'other'] as const;
export type GenderOption = (typeof GENDERS)[number];

export const EMPLOYMENT_TYPES = [
  'Permanent',
  'Contract',
  'Part-time',
  'Casual',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const QUALIFICATION_OPTIONS = [
  'PHD',
  'Masters',
  'Degree',
  'Diploma',
  'Certificate',
  'Other',
] as const;
export type QualificationOption = (typeof QUALIFICATION_OPTIONS)[number];

export const RELATIONSHIP_OPTIONS = [
  'Partner',
  'Sibling',
  'Father',
  'Mother',
  'Relative',
  'Guardian',
] as const;
export type RelationshipOption = (typeof RELATIONSHIP_OPTIONS)[number];

export class CreateStaffDto {
  // Section 1: Account details (employee number is auto-generated server-side)
  @IsEmail()
  @Length(3, 255)
  email: string;

  /** Role name (e.g. "trainer"); resolved to a role id server-side. */
  @IsString()
  @Length(1, 100)
  role: string;

  // Section 2: Personal information (on User)
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

  @IsEnum(GENDERS)
  gender: GenderOption;

  @IsDateString()
  dateOfBirth?: string;

  @IsString()
  @Length(1, 255)
  nationality?: string;

  @IsString()
  @Length(1, 255)
  nationalId?: string;

  @IsString()
  @Length(1, 255)
  placeOfBirth?: string;

  @IsString()
  @Length(1, 255)
  religion?: string;

  @IsString()
  @Length(1, 50)
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  alternativePhoneNumber?: string;

  @IsString()
  @Length(1, 255)
  county?: string;

  // Section 3: Employment details (on StaffProfile)
  @IsInt()
  departmentId: number;

  @IsString()
  @Length(1, 255)
  jobTitle?: string;

  @IsEnum(EMPLOYMENT_TYPES)
  employmentType: EmploymentType;

  @IsDateString()
  @IsOptional()
  dateJoined?: string;

  @IsDateString()
  @IsOptional()
  contractEndDate?: string;

  @IsNumber()
  @Min(0)
  basicSalary?: number;

  @IsBoolean()
  @IsOptional()
  status?: boolean;

  // Section 5: Identification & benefits
  @IsString()
  @Length(1, 255)
  kraPin?: string;

  @IsString()
  @Length(1, 255)
  nhifNumber?: string;

  @IsString()
  @Length(1, 255)
  nssfNumber?: string;

  // Section 6: Academic & professional
  @IsEnum(QUALIFICATION_OPTIONS)
  highestQualification: QualificationOption;

  @IsString()
  @Length(1, 255)
  specialization?: string;

  // Section 7: Disability information
  @IsBoolean()
  @IsOptional()
  isPwd?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  disabilityType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  disabilityDescription?: string;

  // Section 8: Next of kin
  @IsString()
  @Length(1, 255)
  nextOfKinFirstName?: string;

  @IsString()
  @Length(1, 255)
  nextOfKinLastName?: string;

  @IsString()
  @Length(1, 50)
  nextOfKinPhone?: string;

  @IsString()
  @Length(1, 50)
  nextOfKinAltPhone?: string;

  @IsEmail()
  @Length(1, 255)
  nextOfKinEmail?: string;

  @IsEnum(RELATIONSHIP_OPTIONS)
  nextOfKinRelationship: RelationshipOption;
}
