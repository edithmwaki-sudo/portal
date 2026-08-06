import { IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @Length(1, 512)
  refreshToken: string;
}