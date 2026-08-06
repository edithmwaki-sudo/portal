import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Gender, UserStatus } from '@prisma/client';

export type UserType = 'staff' | 'student';

export class CreateUserDto {
  @IsString()
  @Length(3, 100)
  username: string;

  @IsEmail()
  @Length(3, 255)
  email: string;

  @IsString()
  @Length(8, 255)
  password: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsEnum(['staff', 'student'])
  @IsOptional()
  type?: UserType;

  @IsInt()
  @IsOptional()
  roleId?: number;

  @IsString()
  @IsOptional()
  @Length(0, 50)
  phone?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsBoolean()
  @IsOptional()
  mustResetPassword?: boolean;

  @IsBoolean()
  @IsOptional()
  twoFactorEnabled?: boolean;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
