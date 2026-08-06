import { Expose } from 'class-transformer';

export class PermissionResponseDto {
  @Expose() name: string;
  @Expose() description?: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
