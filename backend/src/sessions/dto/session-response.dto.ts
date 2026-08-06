import { Exclude, Expose } from 'class-transformer';
import type { Session } from '@prisma/client';

@Exclude()
export class SessionResponseDto {
  @Expose() id: number;
  @Expose() sessionUuid: string;
  @Expose() deviceName: string | null;
  @Expose() browser: string | null;
  @Expose() operatingSystem: string | null;
  @Expose() ipAddress: string | null;
  @Expose() expiresAt: Date;
  @Expose() lastUsedAt: Date | null;
  @Expose() createdAt: Date;

  static from(session: Session): SessionResponseDto {
    const dto = new SessionResponseDto();
    Object.assign(dto, session);
    return dto;
  }
}
