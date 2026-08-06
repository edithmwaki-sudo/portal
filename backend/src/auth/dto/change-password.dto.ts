import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @Length(1, 255)
  currentPassword: string;

  @IsString()
  @Length(8, 255)
  newPassword: string;
}
