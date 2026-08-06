import { Expose, Type } from 'class-transformer';

export class CalendarEventTypeDto {
  @Expose() id: number;
  @Expose() code: string;
  @Expose() label: string;
  @Expose() colorHex: string;
}

export class CalendarEventDto {
  @Expose() id: number;
  @Expose() academicYearId: number;
  @Expose() academicSessionId: number;
  @Expose() eventTypeId: number;
  @Expose() title: string;
  @Expose() description: string | null;
  @Expose() @Type(() => Date) startDate: Date;
  @Expose() @Type(() => Date) endDate: Date;
  @Expose() source: string;
  @Expose() isLocked: boolean;
  @Expose() @Type(() => Date) createdAt: Date;
  @Expose() @Type(() => Date) updatedAt: Date;
  @Expose() @Type(() => CalendarEventTypeDto) eventType: CalendarEventTypeDto;
}
