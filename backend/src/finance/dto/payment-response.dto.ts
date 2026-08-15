import { Expose, Type } from 'class-transformer';

export class PaymentAllocationResponseDto {
  @Expose() id: number;
  @Expose() invoiceId: number;
  @Expose() invoiceNumber: string | null;
  @Expose() amount: number;
  @Expose() allocatedAt: Date;
}

export class PaymentResponseDto {
  @Expose() id: number;
  @Expose() studentId: number | null;
  @Expose() studentName: string | null;
  @Expose() studentAdmissionNumber: string | null;
  @Expose() academicSessionId: number | null;
  @Expose() academicSessionName: string | null;
  @Expose() amount: number;
  @Expose() paymentDate: Date;
  @Expose() method: string;
  @Expose() reference: string | null;
  @Expose() status: string;
  @Expose() reversedAt: Date | null;
  @Expose() reversedBy: number | null;
  @Expose() reversalReason: string | null;
  @Expose() notes: string | null;
  @Expose() createdAt: Date;

  @Expose()
  @Type(() => PaymentAllocationResponseDto)
  allocations?: PaymentAllocationResponseDto[];
}
