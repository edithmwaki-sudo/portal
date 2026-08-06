import { Expose } from 'class-transformer';

export class CurriculumResponseDto {
  @Expose() id: number;
  @Expose() certificationAuthorityId: number;
  @Expose() certificationAuthorityCode: string | null;
  @Expose() certificationAuthorityName: string | null;
  @Expose() cycleName: string;
  @Expose() isActive: boolean;
  @Expose() startedAt: Date | null;
  @Expose() endedAt: Date | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}