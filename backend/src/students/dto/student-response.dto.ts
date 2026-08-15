import { Expose, Type } from 'class-transformer';

export class StudentUserDto {
  @Expose() id: number;
  @Expose() username: string;
  @Expose() email: string;
  @Expose() phone: string | null;
  @Expose() name: string;
  @Expose() firstName: string | null;
  @Expose() middleName: string | null;
  @Expose() lastName: string | null;
  @Expose() gender: string | null;
  @Expose() dateOfBirth: string | null;
  @Expose() nationality: string | null;
  @Expose() placeOfBirth: string | null;
  @Expose() religion: string | null;
  @Expose() county: string | null;
  @Expose() alternativePhoneNumber: string | null;
  @Expose() address: string | null;
  @Expose() city: string | null;
  @Expose() postalCode: string | null;
  @Expose() isPwd: boolean;
  @Expose() disabilityType: string | null;
  @Expose() disabilityDescription: string | null;
  @Expose() mustResetPassword: boolean;
  @Expose() status: string;
  @Expose() role: { id: number; name: string; displayName: string } | null;
}

export class CourseEnrolmentDto {
  @Expose() id: number;
  @Expose() courseCurriculumId: number;
  @Expose() courseId: number | null;
  @Expose() courseName: string | null;
  @Expose() courseCode: string | null;
  @Expose() courseInitials: string | null;
  @Expose() departmentName: string | null;
  @Expose() authorityName: string | null;
  @Expose() certificationAuthorityId: number | null;
  @Expose() levelName: string | null;
  @Expose() certificationLevelId: number | null;
  @Expose() curriculumId: number | null;
  @Expose() curriculumName: string | null;
  @Expose() academicSessionId: number | null;
  @Expose() academicSessionName: string | null;
  @Expose() academicYearId: number | null;
  @Expose() academicYearName: string | null;
  @Expose() enrolmentDate: Date | null;
  @Expose() status: string;
  @Expose() remarks: string | null;
}

export class StudentResponseDto {
  @Expose() id: number;
  @Expose() admissionNumber: string | null;
  @Expose() nationalId: string | null;
  @Expose() courseId: number | null;
  @Expose() level: number | null;
  @Expose() admDate: string | null;
  @Expose() status: string | null;
  @Expose() nextOfKinFirstName: string | null;
  @Expose() nextOfKinLastName: string | null;
  @Expose() nextOfKinPhone: string | null;
  @Expose() nextOfKinAltPhone: string | null;
  @Expose() nextOfKinEmail: string | null;
  @Expose() nextOfKinRelationship: string | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose()
  @Type(() => StudentUserDto)
  user: StudentUserDto;
  @Expose()
  @Type(() => CourseEnrolmentDto)
  activeEnrolment: CourseEnrolmentDto | null;
}
