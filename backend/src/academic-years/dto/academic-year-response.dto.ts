import { Expose, Type } from 'class-transformer';

export class AcademicYearResponseDto {
  @Expose() id: number;
  @Expose() code: string;
  @Expose() name: string;
  @Expose() @Type(() => Date) startDate: Date | null;
  @Expose() @Type(() => Date) endDate: Date | null;
  @Expose() description: string | null;
  @Expose() isActive: boolean;
  @Expose() sessionCount: number;
  @Expose() @Type(() => Date) createdAt: Date;
  @Expose() @Type(() => Date) updatedAt: Date;
}
