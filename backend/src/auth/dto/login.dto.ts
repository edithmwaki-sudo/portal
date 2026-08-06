import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(1, 255)
  usernameOrEmail: string;

  @IsString()
  @Length(1, 255)
  password: string;

  /** When true the session is long-lived (30d) instead of a short browser session. */
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}