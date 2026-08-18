import { Expose, Type } from 'class-transformer';

export class AttendanceEntryDto {
  @Expose() id: number;
  @Expose() unitId: number;
  @Expose() studentProfileId: number | null;
  @Expose() trainerProfileId: number | null;
  @Expose() sessionDate: string;
  @Expose() startTime: string;
  @Expose() status: string;
  @Expose() remarks: string | null;
  @Expose() student: {
    id: number;
    name: string;
    admissionNumber: string | null;
  } | null;
  @Expose() @Type(() => Date) createdAt: Date;
  @Expose() @Type(() => Date) updatedAt: Date;
}
