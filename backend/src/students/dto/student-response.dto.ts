import { Expose, Type } from 'class-transformer';

export class StudentUserDto {
  @Expose() id: number;
  @Expose() username: string;
  @Expose() email: string;
  @Expose() phone: string | null;
  @Expose() name: string;
  @Expose() gender: string | null;
  @Expose() status: string;
  @Expose() role: { id: number; name: string; displayName: string } | null;
  @Expose() mustResetPassword: boolean;
}

export class StudentResponseDto {
  @Expose() id: number;
  @Expose() admissionNumber: string | null;
  @Expose() courseId: number | null;
  @Expose() level: number | null;
  @Expose() admDate: Date | null;
  @Expose() status: string | null;
  @Expose() createdAt: Date;
  @Expose() @Type(() => StudentUserDto) user: StudentUserDto;
}
