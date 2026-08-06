import { Expose, Type } from 'class-transformer';

export class LectureRoomResponseDto {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() code: string;
  @Expose() capacity: number | null;
  @Expose() location: string | null;
  @Expose() description: string | null;
  @Expose() isActive: boolean;
  @Expose() @Type(() => Date) createdAt: Date;
  @Expose() @Type(() => Date) updatedAt: Date;
}
