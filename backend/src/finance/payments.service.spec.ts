import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, LedgerEntryType, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReversePaymentDto } from './dto/reverse-payment.dto';

const prismaMock = {
  payment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  studentProfile: { findFirst: jest.fn() },
  academicSession: { findFirst: jest.fn() },
  invoice: { findMany: jest.fn(), update: jest.fn() },
  invoicePaymentAllocation: { findMany: jest.fn(), create: jest.fn() },
  studentLedgerEntry: { create: jest.fn() },
  $transaction: jest.fn(),
};

const auditMock = { log: jest.fn() };

function makeTx() {
  return {
    payment: { create: prismaMock.payment.create, update: prismaMock.payment.update },
    invoice: { findMany: prismaMock.invoice.findMany, update: prismaMock.invoice.update },
    invoicePaymentAllocation: {
      findMany: prismaMock.invoicePaymentAllocation.findMany,
      create: prismaMock.invoicePaymentAllocation.create,
    },
    studentLedgerEntry: { create: prismaMock.studentLedgerEntry.create },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
}

function p2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.3',
  });
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    studentId: 10,
    student: { id: 10, admissionNumber: 'ICT/0001/25', user: { id: 99, name: 'Jane Doe' } },
    academicSessionId: 4,
    academicSession: { id: 4, name: 'Semester 1 2025/2026' },
    amount: new Prisma.Decimal(1000),
    paymentDate: new Date('2026-08-15'),
    method: PaymentMethod.CASH,
    reference: 'REF-1',
    status: PaymentStatus.COMPLETED,
    reversedAt: null,
    reversedBy: null,
    reversalReason: null,
    notes: null,
    createdAt: new Date(),
    allocations: [],
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  describe('create', () => {
    it('rejects an unknown student', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { studentId: 999, amount: 100, paymentDate: '2026-08-15', method: PaymentMethod.CASH } as CreatePaymentDto,
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a duplicate reference with ConflictException (P2002)', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue({ id: 10 });
      const tx = makeTx();
      tx.invoice.findMany.mockResolvedValue([]);
      tx.payment.create.mockRejectedValue(p2002());
      prismaMock.$transaction.mockImplementation((fn: unknown) =>
        (fn as (t: unknown) => Promise<unknown>)(tx),
      );
      await expect(
        service.create(
          { studentId: 10, amount: 100, paymentDate: '2026-08-15', method: PaymentMethod.CASH, reference: 'DUP' } as CreatePaymentDto,
          1,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('auto-allocates FIFO to the oldest outstanding invoice and mirrors a PAYMENT ledger entry', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue({ id: 10 });
      const tx = makeTx();
      tx.invoice.findMany.mockResolvedValue([
        { id: 100, academicSessionId: 4, status: InvoiceStatus.ISSUED, computedAmount: new Prisma.Decimal(800) },
        { id: 101, academicSessionId: 4, status: InvoiceStatus.ISSUED, computedAmount: new Prisma.Decimal(500) },
      ]);
      tx.invoicePaymentAllocation.findMany.mockResolvedValue([]);
      tx.payment.create.mockResolvedValue({ id: 1, ...paymentRow() });
      tx.invoicePaymentAllocation.create.mockImplementation((args: { data: { invoiceId: number } }) =>
        Promise.resolve({ id: args.data.invoiceId, ...args.data }),
      );
      tx.studentLedgerEntry.create.mockResolvedValue({ id: 1 });
      tx.invoice.update.mockResolvedValue({});
      prismaMock.$transaction.mockImplementation((fn: unknown) =>
        (fn as (t: unknown) => Promise<unknown>)(tx),
      );
      prismaMock.payment.findFirst.mockResolvedValue(paymentRow());

      const result = await service.create(
        { studentId: 10, amount: 1000, paymentDate: '2026-08-15', method: PaymentMethod.CASH, reference: 'REF-1' } as CreatePaymentDto,
        1,
      );

      expect(tx.invoicePaymentAllocation.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: expect.objectContaining({ invoiceId: 100, amount: expect.anything() }) }),
      );
      const allocationArgs = tx.invoicePaymentAllocation.create.mock.calls.map(
        (call: { data: { invoiceId: number } }[]) => call[0].data,
      );
      expect(allocationArgs.map((a: { invoiceId: number }) => a.invoiceId)).toEqual([100, 101]);
      // First invoice gets 800 (fully paid), second gets the remaining 200.
      expect(Number(allocationArgs[0].amount)).toBe(800);
      expect(Number(allocationArgs[1].amount)).toBe(200);

      expect(tx.studentLedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: LedgerEntryType.PAYMENT,
            credit: expect.anything(),
            studentId: 10,
            paymentId: 1,
          }),
        }),
      );
      expect(auditMock.log).toHaveBeenCalledWith('payment.create', 1, 'Payment', 1, expect.anything());
      expect(result).toBeDefined();
    });

    it('leaves overpayment as unallocated credit (amount beyond invoice balances)', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue({ id: 10 });
      const tx = makeTx();
      tx.invoice.findMany.mockResolvedValue([
        { id: 100, academicSessionId: 4, status: InvoiceStatus.ISSUED, computedAmount: new Prisma.Decimal(800) },
      ]);
      tx.invoicePaymentAllocation.findMany.mockResolvedValue([]);
      tx.payment.create.mockResolvedValue({ id: 1 });
      tx.invoicePaymentAllocation.create.mockResolvedValue({ id: 1 });
      tx.studentLedgerEntry.create.mockResolvedValue({ id: 1 });
      prismaMock.$transaction.mockImplementation((fn: unknown) =>
        (fn as (t: unknown) => Promise<unknown>)(tx),
      );
      prismaMock.payment.findFirst.mockResolvedValue(paymentRow());

      await service.create(
        { studentId: 10, amount: 2000, paymentDate: '2026-08-15', method: PaymentMethod.CASH, reference: 'REF-1' } as CreatePaymentDto,
        1,
      );

      const allocationArgs = tx.invoicePaymentAllocation.create.mock.calls.map(
        (call: { data: { invoiceId: number } }[]) => call[0].data,
      );
      expect(allocationArgs.length).toBe(1);
      expect(Number(allocationArgs[0].amount)).toBe(800);
    });

    it('rejects an explicit allocation larger than the outstanding balance', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue({ id: 10 });
      const tx = makeTx();
      tx.invoice.findMany.mockResolvedValue([
        { id: 100, studentId: 10, status: InvoiceStatus.ISSUED, computedAmount: new Prisma.Decimal(800), academicSessionId: 4 },
      ]);
      tx.invoicePaymentAllocation.findMany.mockResolvedValue([]);
      tx.$queryRaw.mockResolvedValue([]);
      prismaMock.$transaction.mockImplementation((fn: unknown) =>
        (fn as (t: unknown) => Promise<unknown>)(tx),
      );

      await expect(
        service.create(
          {
            studentId: 10,
            amount: 1000,
            paymentDate: '2026-08-15',
            method: PaymentMethod.CASH,
            allocations: [{ invoiceId: 100, amount: 900 }],
          } as CreatePaymentDto,
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an explicit allocation to a cancelled invoice', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue({ id: 10 });
      const tx = makeTx();
      tx.invoice.findMany.mockResolvedValue([
        { id: 100, studentId: 10, status: InvoiceStatus.CANCELLED, computedAmount: new Prisma.Decimal(800), academicSessionId: 4 },
      ]);
      tx.invoicePaymentAllocation.findMany.mockResolvedValue([]);
      prismaMock.$transaction.mockImplementation((fn: unknown) =>
        (fn as (t: unknown) => Promise<unknown>)(tx),
      );

      await expect(
        service.create(
          {
            studentId: 10,
            amount: 100,
            paymentDate: '2026-08-15',
            method: PaymentMethod.CASH,
            allocations: [{ invoiceId: 100, amount: 50 }],
          } as CreatePaymentDto,
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reverse', () => {
    it('rejects an unknown payment', async () => {
      prismaMock.payment.findFirst.mockResolvedValue(null);
      await expect(
        service.reverse(1, { reason: 'test' } as ReversePaymentDto, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an already-reversed payment', async () => {
      prismaMock.payment.findFirst.mockResolvedValue(
        paymentRow({ status: PaymentStatus.REVERSED }),
      );
      await expect(
        service.reverse(1, { reason: 'test' } as ReversePaymentDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks the payment reversed and posts a PAYMENT_REVERSAL ledger entry', async () => {
      prismaMock.payment.findFirst.mockResolvedValue(
        paymentRow({ allocations: [{ id: 1, invoiceId: 100, amount: new Prisma.Decimal(800) }] }),
      );
      const tx = makeTx();
      tx.payment.update.mockResolvedValue({});
      tx.studentLedgerEntry.create.mockResolvedValue({ id: 1 });
      tx.invoice.findMany.mockResolvedValue([]);
      tx.invoicePaymentAllocation.findMany.mockResolvedValue([]);
      prismaMock.$transaction.mockImplementation((fn: unknown) =>
        (fn as (t: unknown) => Promise<unknown>)(tx),
      );
      prismaMock.payment.findFirst
        .mockResolvedValueOnce(paymentRow({ allocations: [{ id: 1, invoiceId: 100, amount: new Prisma.Decimal(800) }] }))
        .mockResolvedValueOnce(paymentRow({ status: PaymentStatus.REVERSED, reversalReason: 'Wrong amount' }));

      const result = await service.reverse(1, { reason: 'Wrong amount' } as ReversePaymentDto, 1);

      expect(tx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: PaymentStatus.REVERSED }),
        }),
      );
      expect(tx.studentLedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: LedgerEntryType.PAYMENT_REVERSAL }),
        }),
      );
      expect(auditMock.log).toHaveBeenCalledWith('payment.reverse', 1, 'Payment', 1, expect.anything());
      expect(result.status).toBe(PaymentStatus.REVERSED);
    });
  });

  describe('findAll', () => {
    it('passes the method filter through as an exact enum match', async () => {
      prismaMock.payment.count.mockResolvedValue(0);
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.$transaction.mockResolvedValue([0, []]);
      await service.findAll({ page: 1, limit: 25, method: PaymentMethod.CASH });
      expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ method: PaymentMethod.CASH }) }),
      );
    });
  });

  describe('findOneById', () => {
    it('throws NotFound when the payment does not exist', async () => {
      prismaMock.payment.findFirst.mockResolvedValue(null);
      await expect(service.findOneById(1)).rejects.toThrow(NotFoundException);
    });
  });
});
