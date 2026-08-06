import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
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

export class CreateStudentDto {
  // Account + login
  @IsString()
  @Length(3, 100)
  username: string;

  @IsEmail()
  @Length(3, 255)
  email: string;

  @IsString()
  @Length(8, 255)
  password: string;

  // Personal (on User)
  @IsString()
  @Length(1, 255)
  name: string;

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
  @Length(0, 100)
  county?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  religion?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  phone?: string;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  alternativePhoneNumber?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  address?: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  city?: string;

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

  // Student profile
  @IsString()
  @IsOptional()
  @Length(0, 50)
  admissionNumber?: string;

  @IsInt()
  @IsOptional()
  courseId?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(6)
  level?: number;

  @IsDateString()
  @IsOptional()
  admDate?: string;

  @IsEnum(STUDENT_STATUSES)
  @IsOptional()
  status?: StudentStatus;
}
