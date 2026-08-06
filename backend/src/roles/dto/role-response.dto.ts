import { Expose, Type } from 'class-transformer';
import { PermissionResponseDto } from '../../permissions/dto/permission-response.dto';

export class RoleResponseDto {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() displayName: string;
  @Expose()
  @Type(() => PermissionResponseDto)
  permissions: PermissionResponseDto[];
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
