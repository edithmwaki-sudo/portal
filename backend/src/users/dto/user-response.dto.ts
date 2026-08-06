import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose() id: number;
  @Expose() username: string;
  @Expose() email: string;
  @Expose() phone: string | null;
  @Expose() name: string;
  @Expose() gender: string | null;
  @Expose() status: string;
  @Expose() role: { id: number; name: string; displayName: string } | null;
  @Expose() mustResetPassword: boolean;
  @Expose() twoFactorEnabled: boolean;
  @Expose() emailVerifiedAt: Date | null;
  @Expose() lastLoginAt: Date | null;
  @Expose() createdAt: Date;
}
