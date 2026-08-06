import { Expose, Type } from 'class-transformer';

export class TimetableEntryDto {
  @Expose() id: number;
  @Expose() academicSessionId: number;
  @Expose() unitId: number;
  @Expose() trainerStaffId: number | null;
  @Expose() lectureRoomId: number | null;
  @Expose() dayOfWeek: number;
  @Expose() startTime: string;
  @Expose() endTime: string;
  @Expose() type: string;
  @Expose() recurrence: string;
  @Expose() date: string | null;
  @Expose() notes: string | null;
  @Expose() unit: { id: number; code: string; name: string } | null;
  @Expose() trainer: { id: number; name: string; employeeNumber: string | null } | null;
  @Expose() room: { id: number; name: string; code: string } | null;
  @Expose() @Type(() => Date) createdAt: Date;
  @Expose() @Type(() => Date) updatedAt: Date;
}
