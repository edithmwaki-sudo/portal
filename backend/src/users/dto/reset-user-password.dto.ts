import { IsString, Length } from 'class-validator';

export class ResetUserPasswordDto {
  @IsString()
  @Length(8, 255)
  newPassword: string;
}
