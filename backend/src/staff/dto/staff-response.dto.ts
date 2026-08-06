import { Expose, Type } from 'class-transformer';

export class StaffResponseDto {
  @Expose() id: number;
  @Expose() userId: number;
  @Expose() email: string | null;
  @Expose() roleId: number | null;
  @Expose() roleName: string | null;

  @Expose() employeeNumber: string | null;

  @Expose() firstName: string | null;
  @Expose() middleName: string | null;
  @Expose() lastName: string | null;
  @Expose() fullName: string | null;

  @Expose() gender: string | null;
  @Expose() @Type(() => Date) dateOfBirth: Date | null;
  @Expose() nationality: string | null;
  @Expose() nationalId: string | null;
  @Expose() placeOfBirth: string | null;
  @Expose() religion: string | null;
  @Expose() phoneNumber: string | null;
  @Expose() alternativePhoneNumber: string | null;
  @Expose() county: string | null;

  @Expose() departmentId: number | null;
  @Expose() departmentName: string | null;
  @Expose() departmentCode: string | null;

  @Expose() jobTitle: string | null;
  @Expose() employmentType: string | null;
  @Expose() @Type(() => Date) dateJoined: Date | null;
  @Expose() @Type(() => Date) contractEndDate: Date | null;

  @Expose() kraPin: string | null;
  @Expose() nhifNumber: string | null;
  @Expose() nssfNumber: string | null;

  @Expose() highestQualification: string | null;
  @Expose() specialization: string | null;

  @Expose() isPwd: boolean;
  @Expose() disabilityType: string | null;
  @Expose() disabilityDescription: string | null;

  @Expose() nextOfKinFirstName: string | null;
  @Expose() nextOfKinLastName: string | null;
  @Expose() nextOfKinPhone: string | null;
  @Expose() nextOfKinAltPhone: string | null;
  @Expose() nextOfKinEmail: string | null;
  @Expose() nextOfKinRelationship: string | null;

  @Expose() status: boolean;
  @Expose() @Type(() => Date) createdAt: Date;
  @Expose() @Type(() => Date) updatedAt: Date;

  @Expose() @Type(() => Number) basicSalary: number | null;
}
