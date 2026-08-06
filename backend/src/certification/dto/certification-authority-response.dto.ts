import { Expose, Type } from 'class-transformer';

export class CertificationLevelBriefDto {
  @Expose() id: number;
  @Expose() code: string;
  @Expose() name: string;
  @Expose() entryGrade: string | null;
  @Expose() description: string | null;
  @Expose() isActive: boolean;
}

export class CertificationAuthorityResponseDto {
  @Expose() id: number;
  @Expose() code: string;
  @Expose() name: string;
  @Expose() description: string | null;
  @Expose() isActive: boolean;
  @Expose() levelsCount: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() @Type(() => CertificationLevelBriefDto) levels?: CertificationLevelBriefDto[];
}
