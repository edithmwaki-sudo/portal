import { Expose, Type } from 'class-transformer';

export class DepartmentHeadDto {
  @Expose() id: number;
  @Expose() employeeNumber: string | null;
  @Expose() jobTitle: string | null;
  @Expose() @Type(() => Object) user: { id: number; name: string };
}

export class DepartmentResponseDto {
  @Expose() id: number;
  @Expose() code: string;
  @Expose() name: string;
  @Expose() headOfDepartmentId: number | null;
  @Expose() headOfDepartmentName: string | null;
  @Expose() headOfDepartmentEmployeeNumber: string | null;
  @Expose() description: string | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
