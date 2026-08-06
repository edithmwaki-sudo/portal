import { Expose, Type } from 'class-transformer';

class CourseCurriculumItemDto {
  @Expose() id: number;
  @Expose() courseCurriculumId: number;
  @Expose() cycleName: string;
  @Expose() isActive: boolean;
}

export class CourseResponseDto {
  @Expose() id: number;
  @Expose() code: string;
  @Expose() initials: string;
  @Expose() name: string;
  @Expose() durationMonths: number | null;
  @Expose() description: string | null;
  @Expose() isActive: boolean;
  @Expose() certificationAuthorityId: number | null;
  @Expose() certificationAuthorityCode: string | null;
  @Expose() certificationAuthorityName: string | null;
  @Expose() certificationLevelId: number | null;
  @Expose() certificationLevelCode: string | null;
  @Expose() certificationLevelName: string | null;
  @Expose() departmentId: number | null;
  @Expose() departmentName: string | null;
  @Expose()
  @Type(() => CourseCurriculumItemDto)
  curricula: CourseCurriculumItemDto[];
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
