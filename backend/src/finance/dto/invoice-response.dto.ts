import { Expose, Type } from 'class-transformer';

export class InvoiceItemResponseDto {
  @Expose() id: number;
  @Expose() feeItemId: number | null;
  @Expose() itemName: string;
  @Expose() description: string | null;
  @Expose() amount: number;
  @Expose() quantity: number;
  @Expose() totalAmount: number;
}

export class InvoiceResponseDto {
  @Expose() id: number;
  @Expose() invoiceNumber: string;
  @Expose() studentId: number;
  @Expose() studentName: string | null;
  @Expose() studentAdmissionNumber: string | null;
  @Expose() courseId: number | null;
  @Expose() courseName: string | null;
  @Expose() courseCode: string | null;
  @Expose() courseCurriculumId: number | null;
  @Expose() curriculumId: number | null;
  @Expose() curriculumName: string | null;
  @Expose() academicYearId: number | null;
  @Expose() academicYearName: string | null;
  @Expose() academicSessionId: number | null;
  @Expose() academicSessionName: string | null;
  @Expose() feeStructureId: number | null;
  @Expose() feeStructureName: string | null;
  @Expose() type: string;
  @Expose() chargeType: string | null;
  @Expose() status: string;
  @Expose() amountDue: number;
  @Expose() computedAmount: number;
  @Expose() paidAmount: number;
  @Expose() balance: number;
  @Expose() issueDate: Date;
  @Expose() dueDate: Date;
  @Expose() notes: string | null;
  @Expose() reason: string | null;
  @Expose() reversedAt: Date | null;
  @Expose() reversedBy: number | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose()
  @Type(() => InvoiceItemResponseDto)
  items?: InvoiceItemResponseDto[];
}
