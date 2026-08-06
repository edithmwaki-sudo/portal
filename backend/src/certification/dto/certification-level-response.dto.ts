import { Expose } from 'class-transformer';

export class CertificationLevelResponseDto {
  @Expose() id: number;
  @Expose() certificationAuthorityId: number;
  @Expose() certificationAuthorityCode: string | null;
  @Expose() certificationAuthorityName: string | null;
  @Expose() code: string;
  @Expose() name: string;
  @Expose() entryGrade: string | null;
  @Expose() description: string | null;
  @Expose() isActive: boolean;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
