import { Expose } from 'class-transformer';

export class CertificationGradeResponseDto {
  @Expose() id: number;
  @Expose() certificationAuthorityId: number;
  @Expose() grade: string;
  @Expose() gradeStart: number;
  @Expose() gradeEnd: number;
  @Expose() remark: string | null;
  @Expose() isActive: boolean;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
