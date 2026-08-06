import { Expose, Type } from 'class-transformer';

export class AuditUserDto {
  @Expose() id: number;
  @Expose() username: string;
  @Expose() name: string;
}

export class AuditEntryResponseDto {
  @Expose() id: number;
  @Expose() userId: number | null;
  @Expose() action: string;
  @Expose() entityType: string | null;
  @Expose() entityId: string | null;
  @Expose() oldValues: unknown;
  @Expose() newValues: unknown;
  @Expose() ipAddress: string | null;
  @Expose() userAgent: string | null;
  @Expose() requestId: string | null;
  @Expose() createdAt: Date;
  @Expose()
  @Type(() => AuditUserDto)
  user: AuditUserDto | null;
}
