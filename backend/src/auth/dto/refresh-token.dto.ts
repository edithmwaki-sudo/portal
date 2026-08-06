import { IsOptional, IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  /** Optional — the token is normally sent in the httpOnly refresh cookie. */
  @IsOptional()
  @IsString()
  @Length(1, 512)
  refreshToken?: string;
}
