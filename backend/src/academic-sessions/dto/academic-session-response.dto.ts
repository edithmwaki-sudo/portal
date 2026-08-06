import { Expose, Type } from 'class-transformer';

export class AcademicSessionResponseDto {
  @Expose() id: number;
  @Expose() academicYearId: number;
  @Expose() yearCode: string | null;
  @Expose() yearName: string | null;
  @Expose() code: string;
  @Expose() name: string;
  @Expose() @Type(() => Date) startDate: Date | null;
  @Expose() @Type(() => Date) endDate: Date | null;
  @Expose() description: string | null;
  @Expose() isActive: boolean;
  @Expose() eventCount: number;
  @Expose() timetableCount: number;
  @Expose() @Type(() => Date) createdAt: Date;
  @Expose() @Type(() => Date) updatedAt: Date;
}
