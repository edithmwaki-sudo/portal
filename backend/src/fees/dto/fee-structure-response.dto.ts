import { Expose, Type } from 'class-transformer';
import { FeeStatus } from '@prisma/client';

export class FeeItemResponseDto {
  @Expose() id: number;
  @Expose() itemName: string;
  @Expose() amount: number;
  @Expose() displayOrder: number;
}

export class FeeStructureResponseDto {
  @Expose() id: number;
  @Expose() feeName: string;
  @Expose() description: string | null;
  @Expose() startDate: string;
  @Expose() endDate: string | null;
  @Expose() status: FeeStatus;
  @Expose() itemsCount: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose()
  @Type(() => FeeItemResponseDto)
  items?: FeeItemResponseDto[];
}
