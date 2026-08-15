import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FeeStatus, InvoiceStatus, InvoiceType, LedgerEntryType, Prisma } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateAdhocInvoiceDto } from './dto/create-adhoc-invoice.dto';
import { ReverseInvoiceDto } from './dto/reverse-invoice.dto';

const prismaMock = {
  invoice: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  studentProfile: { findFirst: jest.fn() },
  academicSession: { findFirst: jest.fn() },
  courseFeeAssignment: { findFirst: jest.fn() },
  invoicePaymentAllocation: { findMany: jest.fn(), findFirst: jest.fn() },
  studentLedgerEntry: { findMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

const auditMock = { log: jest.fn() };

function makeTx() {
  return {
    invoice: { create: prismaMock.invoice.create, update: prismaMock.invoice.update },
    studentLedgerEntry: { create: prismaMock.studentLedgerEntry.create },
    invoiceSequence: { upsert: jest.fn().mockResolvedValue({}) },
    $queryRaw: jest.fn().mockResolvedValue([{ last_value: 1 }]),
  };
}

function studentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    user: { id: 99, name: 'Jane Doe' },
    courseEnrolments: [
      {
        id: 5,
        courseCurriculum: {
          id: 7,
          courseId: 1,
          curriculumId: 2,
          course: { id: 1, name: 'ICT', code: 'ICT' },
          curriculum: { id: 2, cycleName: '2024 - 2027' },
        },
        academicSessionId: 4,
        academicSession: { id: 4, name: 'Semester 1 2025/2026', academicYearId: 1 },
      },
    ],
    ...overrides,
  };
}

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    invoiceNumber: 'INV-2026-0001',
    studentId: 10,
    student: { id: 10, admissionNumber: 'ICT/0001/25', user: { id: 99, name: 'Jane Doe' } },
    courseId: 1,
    courseCurriculumId: 7,
    curriculumId: 2,
    academicYearId: 1,
    academicSessionId: 4,
    feeStructureId: 9,
    feeStructure: { id: 9, feeName: 'Tuition 2026' },
    academicYear: { id: 1, name: 'AY 2025/2026' },
    academicSession: { id: 4, name: 'Semester 1 2025/2026' },
    course: { id: 1, name: 'ICT', code: 'ICT' },
    curriculum: { id: 2, cycleName: '2024 - 2027' },
    type: InvoiceType.FEES,
    chargeType: null,
    status: InvoiceStatus.ISSUED,
    amountDue: new Prisma.Decimal(17000),
    computedAmount: new Prisma.Decimal(17000),
    issueDate: new Date('2026-08-15'),
    dueDate: new Date('2026-09-14'),
    notes: null,
    reason: null,
    reversedAt: null,
    reversedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
    ...overrides,
  };
}

function assignmentRow() {
  return {
    id: 1,
    status: FeeStatus.ACTIVE,
    feeStructure: {
      id: 9,
      feeName: 'Tuition 2026',
      items: [
        { id: 1, itemName: 'Tuition', amount: new Prisma.Decimal(15000), displayOrder: 0 },
        { id: 2, itemName: 'Registration', amount: new Prisma.Decimal(2000), displayOrder: 1 },
      ],
    },
  };
}

describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(InvoicesService);
  });

  describe('createFromTemplate', () => {
    it('rejects an unknown student', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue(null);
      await expect(
        service.createFromTemplate({ studentId: 999 } as CreateInvoiceDto, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a student with no course enrolment', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue(studentRow({ courseEnrolments: [] }));
      await expect(
        service.createFromTemplate({ studentId: 10 } as CreateInvoiceDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when no active fee assignment exists', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue(studentRow());
      prismaMock.academicSession.findFirst.mockResolvedValue({ id: 4, academicYearId: 1 });
      prismaMock.courseFeeAssignment.findFirst.mockResolvedValue(null);
      await expect(
        service.createFromTemplate({ studentId: 10 } as CreateInvoiceDto, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a duplicate active invoice for the same structure/session', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue(studentRow());
      prismaMock.academicSession.findFirst.mockResolvedValue({ id: 4, academicYearId: 1 });
      prismaMock.courseFeeAssignment.findFirst.mockResolvedValue(assignmentRow());
      prismaMock.invoice.findFirst.mockResolvedValue({ id: 3, invoiceNumber: 'INV-2026-0003' });
      await expect(
        service.createFromTemplate({ studentId: 10 } as CreateInvoiceDto, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('creates the invoice with line items and a matching INVOICE ledger entry', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue(studentRow());
      prismaMock.academicSession.findFirst.mockResolvedValue({ id: 4, academicYearId: 1 });
      prismaMock.courseFeeAssignment.findFirst.mockResolvedValue(assignmentRow());
      prismaMock.invoice.findFirst.mockResolvedValue(null);
      const tx = makeTx();
      tx.invoice.create.mockResolvedValue(invoiceRow());
      tx.studentLedgerEntry.create.mockResolvedValue({ id: 1 });
      prismaMock.$transaction.mockImplementation((fn: unknown) =>
        (fn as (t: unknown) => Promise<unknown>)(tx),
      );
      prismaMock.invoicePaymentAllocation.findMany.mockResolvedValue([]);

      const result = await service.createFromTemplate({ studentId: 10 } as CreateInvoiceDto, 1);

      expect(tx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: 'INV-2026-0001',
            studentId: 10,
            type: InvoiceType.FEES,
            status: InvoiceStatus.ISSUED,
            computedAmount: expect.anything(),
            items: expect.objectContaining({ create: expect.arrayContaining([expect.anything()]) }),
          }),
        }),
      );
      expect(tx.studentLedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LedgerEntryType.INVOICE, debit: expect.anything() }),
        }),
      );
      expect(auditMock.log).toHaveBeenCalledWith('invoice.create', 1, 'Invoice', 1, expect.anything());
      expect(result.invoiceNumber).toBe('INV-2026-0001');
      expect(Number(result.computedAmount)).toBe(17000);
    });
  });

  describe('createAdhoc', () => {
    it('computes the total including quantities and mirrors an INVOICE ledger entry', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue(studentRow());
      const tx = makeTx();
      tx.invoice.create.mockResolvedValue(invoiceRow({ type: InvoiceType.ADHOC, chargeType: 'FINE' }));
      tx.studentLedgerEntry.create.mockResolvedValue({ id: 1 });
      prismaMock.$transaction.mockImplementation((fn: unknown) =>
        (fn as (t: unknown) => Promise<unknown>)(tx),
      );
      prismaMock.invoicePaymentAllocation.findMany.mockResolvedValue([]);

      await service.createAdhoc(
        {
          studentId: 10,
          chargeType: 'FINE' as never,
          items: [
            { itemName: 'Library fine', amount: 500, quantity: 2 },
            { itemName: 'ID card', amount: 250 },
          ],
        } as CreateAdhocInvoiceDto,
        1,
      );

      const createCall = tx.invoice.create.mock.calls[0][0] as {
        data: { computedAmount: Prisma.Decimal };
      };
      // 500*2 + 250 = 1250
      expect(Number(createCall.data.computedAmount)).toBe(1250);
      expect(tx.studentLedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LedgerEntryType.INVOICE }),
        }),
      );
    });

    it('rejects a line with no item name', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue(studentRow());
      await expect(
        service.createAdhoc(
          {
            studentId: 10,
            chargeType: 'FINE' as never,
            items: [{ itemName: '   ', amount: 100 }],
          } as CreateAdhocInvoiceDto,
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reverse', () => {
    it('rejects an unknown invoice', async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(null);
      await expect(
        service.reverse(1, { reason: 'test' } as ReverseInvoiceDto, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an already-cancelled invoice', async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(invoiceRow({ status: InvoiceStatus.CANCELLED }));
      await expect(
        service.reverse(1, { reason: 'test' } as ReverseInvoiceDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reversing an invoice that has payments applied', async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(invoiceRow());
      prismaMock.invoicePaymentAllocation.findFirst.mockResolvedValue({ id: 1 });
      await expect(
        service.reverse(1, { reason: 'test' } as ReverseInvoiceDto, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('cancels the invoice and posts an INVOICE_REVERSAL ledger entry', async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(invoiceRow());
      prismaMock.invoicePaymentAllocation.findFirst.mockResolvedValue(null);
      const tx = makeTx();
      tx.invoice.update.mockResolvedValue(invoiceRow({ status: InvoiceStatus.CANCELLED, reason: 'Duplicate' }));
      tx.studentLedgerEntry.create.mockResolvedValue({ id: 1 });
      prismaMock.$transaction.mockImplementation((fn: unknown) =>
        (fn as (t: unknown) => Promise<unknown>)(tx),
      );

      const result = await service.reverse(1, { reason: 'Duplicate' } as ReverseInvoiceDto, 1);

      expect(tx.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: InvoiceStatus.CANCELLED }),
        }),
      );
      expect(tx.studentLedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LedgerEntryType.INVOICE_REVERSAL, credit: expect.anything() }),
        }),
      );
      expect(result.status).toBe(InvoiceStatus.CANCELLED);
    });
  });

  describe('statement', () => {
    it('derives totals from ledger entries and reports unallocated credit', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue({
        id: 10,
        admissionNumber: 'ICT/0001/25',
        user: { id: 99, name: 'Jane Doe' },
      });
      prismaMock.studentLedgerEntry.findMany.mockResolvedValue([
        { id: 1, type: LedgerEntryType.INVOICE, debit: new Prisma.Decimal(17000), credit: new Prisma.Decimal(0), transactionDate: new Date() },
        { id: 2, type: LedgerEntryType.PAYMENT, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(10000), transactionDate: new Date() },
      ]);
      prismaMock.$queryRaw.mockResolvedValue([{ unallocated: new Prisma.Decimal(500) }]);

      const statement = await service.statement(10);

      expect(statement.totals.invoiced).toBe(17000);
      expect(statement.totals.paid).toBe(10000);
      expect(statement.totals.balance).toBe(7000);
      expect(statement.totals.unallocated).toBe(500);
    });

    it('reports a credit balance when payments exceed the amount invoiced', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue({
        id: 10,
        admissionNumber: 'ICT/0001/25',
        user: { id: 99, name: 'Jane Doe' },
      });
      prismaMock.studentLedgerEntry.findMany.mockResolvedValue([
        { id: 1, type: LedgerEntryType.INVOICE, debit: new Prisma.Decimal(17000), credit: new Prisma.Decimal(0), transactionDate: new Date() },
        { id: 2, type: LedgerEntryType.INVOICE_REVERSAL, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(17000), transactionDate: new Date() },
        { id: 3, type: LedgerEntryType.PAYMENT, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(18000), transactionDate: new Date() },
      ]);
      prismaMock.$queryRaw.mockResolvedValue([{ unallocated: new Prisma.Decimal(18000) }]);

      const statement = await service.statement(10);

      expect(statement.totals.invoiced).toBe(0);
      expect(statement.totals.paid).toBe(18000);
      expect(statement.totals.balance).toBe(-18000);
      expect(statement.totals.creditBalance).toBe(18000);
      expect(statement.totals.unallocated).toBe(18000);
    });
  });
});
