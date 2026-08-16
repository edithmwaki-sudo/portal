import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerEntryType, Prisma } from '@prisma/client';
import { FeeStatementsService } from './fee-statements.service';
import { PrismaService } from '../prisma/prisma.service';

const prismaMock = {
  academicYear: { findFirst: jest.fn(), findUnique: jest.fn() },
  academicSession: { findUnique: jest.fn(), findMany: jest.fn() },
  studentProfile: { findFirst: jest.fn() },
  studentLedgerEntry: { findMany: jest.fn() },
  $queryRaw: jest.fn(),
};

describe('FeeStatementsService', () => {
  let service: FeeStatementsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.academicYear.findUnique.mockResolvedValue(mockActiveYear());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeeStatementsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(FeeStatementsService);
  });

  function mockActiveYear(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      code: 'AY2025/2026',
      name: 'Academic Year 2025/2026',
      isActive: true,
      ...overrides,
    };
  }

  function mockSessions() {
    return [
      {
        id: 4,
        code: 'SEM1',
        name: 'Semester 1 2025/2026',
        academicYearId: 1,
        isActive: true,
        startDate: new Date('2025-09-01'),
      },
      {
        id: 5,
        code: 'SEM2',
        name: 'Semester 2 2025/2026',
        academicYearId: 1,
        isActive: false,
        startDate: new Date('2026-01-12'),
      },
    ];
  }

  function entry(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      studentId: 10,
      invoiceId: null,
      paymentId: null,
      academicSessionId: 4,
      type: LedgerEntryType.INVOICE,
      debit: new Prisma.Decimal('17000'),
      credit: new Prisma.Decimal('0'),
      reference: null,
      description: 'Invoice INV-2026-0001 issued (Tuition 2026)',
      transactionDate: new Date('2025-09-02'),
      academicSession: { id: 4, name: 'Semester 1 2025/2026' },
      invoice: null,
      payment: null,
      ...overrides,
    };
  }

  function mockStudent() {
    return {
      id: 10,
      admissionNumber: 'ICT/0001/25',
      level: 1,
      admDate: new Date('2025-09-01'),
      status: 'ACTIVE',
      deletedAt: null,
      user: { id: 99, name: 'Jane Doe', email: 'jane@apex.local', phone: '0712' },
      course: {
        id: 1,
        code: 'ICT',
        name: 'Information Technology',
        department: { id: 2, name: 'Computing' },
      },
    };
  }

  describe('list', () => {
    it('returns all students with balances, paginated, using the active-year session_to_date scope', async () => {
      prismaMock.academicYear.findFirst.mockResolvedValue(mockActiveYear());
      prismaMock.academicSession.findMany.mockResolvedValue(mockSessions());
      prismaMock.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 10,
            admissionNumber: 'ICT/0001/25',
            name: 'Jane Doe',
            courseCode: 'ICT',
            invoiced: '17000',
            paid: '10000',
          },
          {
            id: 11,
            admissionNumber: 'ICT/0002/25',
            name: 'John Smith',
            courseCode: 'ICT',
            invoiced: '0',
            paid: '0',
          },
        ])
        .mockResolvedValueOnce([{ n: '2' }]);

      const result = await service.list({ page: 1, limit: 25 });

      expect(prismaMock.academicSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { academicYearId: 1 } }),
      );
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        id: 10,
        balance: 7000,
        invoiced: 17000,
        paid: 10000,
      });
      expect(result.scope).toMatchObject({
        mode: 'session_to_date',
        sessionIds: [4],
        includeNullSession: true,
      });
      expect(result.scope.label).toBe('Semester 1 2025/2026 to date');
    });

    it('applies the search filter on name and admission number', async () => {
      prismaMock.academicYear.findFirst.mockResolvedValue(mockActiveYear());
      prismaMock.academicSession.findMany.mockResolvedValue(mockSessions());
      prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ n: '0' }]);

      await service.list({ page: 1, limit: 25, search: 'Jane' });

      const rawCalls = prismaMock.$queryRaw.mock.calls;
      const serialized = JSON.stringify(rawCalls[0]);
      expect(serialized).toContain('ILIKE');
      expect(serialized).toContain('admission_number');
      expect(serialized).toContain('Jane');
    });

    it('throws when per_session scope is requested without an academicSessionId', async () => {
      await expect(service.list({ page: 1, limit: 25, scope: 'per_session' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('resolves per_session to a single session with no null-session rows', async () => {
      prismaMock.academicSession.findUnique.mockResolvedValue({
        id: 4,
        academicYearId: 1,
        name: 'Semester 1 2025/2026',
        isActive: true,
        year: { id: 1, name: 'Academic Year 2025/2026' },
      });
      prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ n: '0' }]);

      const result = await service.list({
        page: 1,
        limit: 25,
        scope: 'per_session',
        academicSessionId: 4,
      });

      expect(prismaMock.academicSession.findUnique).toHaveBeenCalledWith({
        where: { id: 4 },
        include: { year: { select: { id: true, name: true } } },
      });
      expect(result.scope).toMatchObject({
        mode: 'per_session',
        sessionIds: [4],
        includeNullSession: false,
        label: 'Semester 1 2025/2026',
      });
    });

    it('throws when no academic year exists', async () => {
      prismaMock.academicYear.findFirst.mockResolvedValue(null);

      await expect(service.list({ page: 1, limit: 25 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('statementDetail', () => {
    it('throws NotFoundException for an unknown student', async () => {
      prismaMock.academicYear.findFirst.mockResolvedValue(mockActiveYear());
      prismaMock.academicSession.findMany.mockResolvedValue(mockSessions());
      prismaMock.studentProfile.findFirst.mockResolvedValue(null);

      await expect(service.statementDetail(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('builds the ledger with running balances, session grouping and summary', async () => {
      prismaMock.academicYear.findFirst.mockResolvedValue(mockActiveYear());
      prismaMock.academicSession.findMany.mockResolvedValue(mockSessions());
      prismaMock.studentProfile.findFirst.mockResolvedValue(mockStudent());
      prismaMock.studentLedgerEntry.findMany.mockResolvedValue([
        entry({
          id: 1,
          type: LedgerEntryType.INVOICE,
          debit: new Prisma.Decimal('17000'),
          invoice: { invoiceNumber: 'INV-2026-0001' },
        }),
        entry({
          id: 2,
          type: LedgerEntryType.PAYMENT,
          debit: new Prisma.Decimal('0'),
          credit: new Prisma.Decimal('10000'),
          reference: 'PMT-2026-0001',
          description: 'Payment received (PMT-2026-0001)',
          transactionDate: new Date('2025-09-10'),
        }),
        entry({
          id: 3,
          type: LedgerEntryType.PAYMENT,
          debit: new Prisma.Decimal('0'),
          credit: new Prisma.Decimal('5000'),
          academicSessionId: null,
          academicSession: null,
          reference: 'PMT-2026-0002',
          description: 'Payment received (PMT-2026-0002)',
          transactionDate: new Date('2025-09-15'),
        }),
      ]);
      prismaMock.$queryRaw.mockResolvedValueOnce([{ n: '0' }]);

      const result = await service.statementDetail(10, {});

      expect(result.student.name).toBe('Jane Doe');
      expect(result.department?.name).toBe('Computing');
      expect(result.transactions).toHaveLength(3);
      expect(result.transactions[0]).toMatchObject({
        number: 1,
        debit: 17000,
        credit: 0,
        balance: 17000,
        reference: 'INV-2026-0001',
        sessionLabel: 'Semester 1 2025/2026',
      });
      expect(result.transactions[1]).toMatchObject({ balance: 7000 });
      expect(result.transactions[2]).toMatchObject({
        sessionLabel: 'Other Transactions',
        balance: 2000,
      });
      expect(result.transactions[2].number).toBe(1);

      expect(result.sessionBreakdown).toEqual([
        { sessionName: 'Semester 1 2025/2026', fees: 17000, paid: 10000, outstanding: 7000 },
        { sessionName: 'Other Transactions', fees: 0, paid: 5000, outstanding: -5000 },
      ]);

      expect(result.summary).toMatchObject({
        totalDebit: 17000,
        totalCredit: 15000,
        totalInvoiced: 17000,
        totalPaid: 15000,
        outstandingBalance: 2000,
        creditBalance: 0,
        ledgerBalance: 2000,
      });
    });

    it('reports a credit balance when payments exceed invoices', async () => {
      prismaMock.academicYear.findFirst.mockResolvedValue(mockActiveYear());
      prismaMock.academicSession.findMany.mockResolvedValue(mockSessions());
      prismaMock.studentProfile.findFirst.mockResolvedValue(mockStudent());
      prismaMock.studentLedgerEntry.findMany.mockResolvedValue([
        entry({
          id: 1,
          type: LedgerEntryType.INVOICE,
          debit: new Prisma.Decimal('17000'),
          invoice: { invoiceNumber: 'INV-2026-0001' },
        }),
        entry({
          id: 2,
          type: LedgerEntryType.PAYMENT,
          debit: new Prisma.Decimal('0'),
          credit: new Prisma.Decimal('35000'),
          reference: 'PMT-2026-0001',
          description: 'Payment received (PMT-2026-0001)',
          transactionDate: new Date('2025-09-10'),
        }),
      ]);
      prismaMock.$queryRaw.mockResolvedValueOnce([{ n: '18000' }]);

      const result = await service.statementDetail(10, {});

      expect(result.summary).toMatchObject({
        outstandingBalance: 0,
        creditBalance: 18000,
        unallocated: 18000,
        ledgerBalance: -18000,
      });
    });

    it('uses the per_year scope across all sessions when requested', async () => {
      prismaMock.academicYear.findFirst.mockResolvedValue(mockActiveYear());
      prismaMock.academicSession.findMany.mockResolvedValue(mockSessions());
      prismaMock.studentProfile.findFirst.mockResolvedValue(mockStudent());
      prismaMock.studentLedgerEntry.findMany.mockResolvedValue([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([{ n: '0' }]);

      const result = await service.statementDetail(10, { scope: 'per_year' });

      expect(result.scope).toMatchObject({
        mode: 'per_year',
        sessionIds: [4, 5],
        includeNullSession: false,
        label: 'Academic Year 2025/2026',
      });
    });
  });

  describe('generatePdf', () => {
    it('returns a valid PDF buffer', async () => {
      prismaMock.academicYear.findFirst.mockResolvedValue(mockActiveYear());
      prismaMock.academicSession.findMany.mockResolvedValue(mockSessions());
      prismaMock.studentProfile.findFirst.mockResolvedValue(mockStudent());
      prismaMock.studentLedgerEntry.findMany.mockResolvedValue([
        entry({
          id: 1,
          type: LedgerEntryType.INVOICE,
          debit: new Prisma.Decimal('17000'),
          invoice: { invoiceNumber: 'INV-2026-0001' },
        }),
        entry({
          id: 2,
          type: LedgerEntryType.PAYMENT,
          debit: new Prisma.Decimal('0'),
          credit: new Prisma.Decimal('10000'),
          reference: 'PMT-2026-0001',
          description: 'Payment received (PMT-2026-0001)',
          transactionDate: new Date('2025-09-10'),
        }),
      ]);
      prismaMock.$queryRaw.mockResolvedValueOnce([{ n: '0' }]);

      const buffer = await service.generatePdf(10, {});

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
      expect(buffer.length).toBeGreaterThan(500);
    });
  });
});
