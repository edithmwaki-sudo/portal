import { Expose } from 'class-transformer';

class UnitCourseDto {
  @Expose() id: number;
  @Expose() code: string;
  @Expose() initials: string;
  @Expose() name: string;
}

class UnitCurriculumDto {
  @Expose() id: number;
  @Expose() cycleName: string;
}

export class UnitResponseDto {
  @Expose() id: number;
  @Expose() courseId: number;
  @Expose() curriculumId: number;
  @Expose() code: string;
  @Expose() name: string;
  @Expose() description: string | null;
  @Expose() modulesTaught: number | null;
  @Expose() taughtHours: number | null;
  @Expose() creditFactor: number | null;
  @Expose() isActive: boolean;
  @Expose() course: UnitCourseDto | null;
  @Expose() curriculum: UnitCurriculumDto | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
