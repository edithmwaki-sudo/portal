import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LedgerEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  renderStatementPdf,
  StatementPdfData,
  StatementScope,
  StatementScopeMode,
} from './pdf/statement-pdf';

type Numberish = { n?: string | number | bigint };

const TYPE_LABELS: Record<LedgerEntryType, string> = {
  INVOICE: 'Invoice',
  INVOICE_REVERSAL: 'Invoice reversal',
  PAYMENT: 'Payment',
  PAYMENT_REVERSAL: 'Payment reversal',
};

export interface FeeStatementListParams {
  scope?: StatementScopeMode;
  academicYearId?: number;
  academicSessionId?: number;
  search?: string;
  page: number;
  limit: number;
}

export interface FeeStatementDetailParams {
  scope?: StatementScopeMode;
  academicYearId?: number;
  academicSessionId?: number;
}

@Injectable()
export class FeeStatementsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveScope(
    params: { scope?: StatementScopeMode; academicYearId?: number; academicSessionId?: number },
  ): Promise<StatementScope> {
    const mode = params.scope ?? 'session_to_date';

    if (mode === 'per_session') {
      if (!params.academicSessionId) {
        throw new BadRequestException(
          'academicSessionId is required when scope is per_session',
        );
      }
      const session = await this.prisma.academicSession.findUnique({
        where: { id: params.academicSessionId },
        include: { year: { select: { id: true, name: true } } },
      });
      if (!session) {
        throw new BadRequestException('Academic session not found');
      }
      return {
        mode,
        academicYearId: session.academicYearId,
        academicYearName: session.year.name,
        sessionIds: [session.id],
        includeNullSession: false,
        label: session.name,
        activeSessionId: session.isActive ? session.id : null,
        sessions: [
          { id: session.id, name: session.name, isActive: session.isActive },
        ],
      };
    }

    let yearId = params.academicYearId;
    if (!yearId) {
      const active = await this.prisma.academicYear.findFirst({
        where: { isActive: true },
        orderBy: { id: 'desc' },
      });
      yearId = active?.id;
    }
    if (!yearId) {
      const latest = await this.prisma.academicYear.findFirst({
        orderBy: { id: 'desc' },
      });
      yearId = latest?.id;
    }
    if (!yearId) {
      throw new BadRequestException('No academic year is set up yet');
    }

    const year = await this.prisma.academicYear.findUnique({
      where: { id: yearId },
    });
    if (!year) {
      throw new BadRequestException('Academic year not found');
    }

    const sessions = await this.prisma.academicSession.findMany({
      where: { academicYearId: year.id },
      orderBy: [{ startDate: 'asc' }, { code: 'asc' }, { id: 'asc' }],
    });

    if (mode === 'per_year') {
      return {
        mode,
        academicYearId: year.id,
        academicYearName: year.name,
        sessionIds: sessions.map((s) => s.id),
        includeNullSession: false,
        label: year.name,
        activeSessionId: sessions.find((s) => s.isActive)?.id ?? null,
        sessions: sessions.map((s) => ({
          id: s.id,
          name: s.name,
          isActive: s.isActive,
        })),
      };
    }

    const activeIndex = sessions.findIndex((s) => s.isActive);
    const included = activeIndex >= 0 ? sessions.slice(0, activeIndex + 1) : sessions;
    const first = sessions[0];
    const active = activeIndex >= 0 ? sessions[activeIndex] : undefined;
    let label = year.name;
    if (first) {
      if (active && active.id === first.id) label = `${first.name} to date`;
      else if (active) label = `${first.name} to ${active.name}`;
      else label = `${first.name} onwards`;
    }

    return {
      mode,
      academicYearId: year.id,
      academicYearName: year.name,
      sessionIds: included.map((s) => s.id),
      includeNullSession: true,
      label,
      activeSessionId: active?.id ?? null,
      sessions: included.map((s) => ({
        id: s.id,
        name: s.name,
        isActive: s.isActive,
      })),
    };
  }

  private ledgerSessionWhere(scope: StatementScope, alias: string): Prisma.Sql {
    const parts: Prisma.Sql[] = [];
    if (scope.sessionIds.length > 0) {
      parts.push(
        Prisma.sql`${Prisma.raw(alias)}."academic_session_id" IN (${Prisma.join(
          scope.sessionIds.map((id) => Prisma.sql`${id}`),
          ', ',
        )})`,
      );
    }
    if (scope.includeNullSession) {
      parts.push(Prisma.sql`${Prisma.raw(alias)}."academic_session_id" IS NULL`);
    }
    if (parts.length === 0) return Prisma.sql`FALSE`;
    return Prisma.sql`(${Prisma.join(parts, ' OR ')})`;
  }

  private async resolveUnallocated(
    studentId: number,
    scope: StatementScope,
  ): Promise<number> {
    const parts: Prisma.Sql[] = [];
    if (scope.sessionIds.length > 0) {
      parts.push(
        Prisma.sql`p."academic_session_id" IN (${Prisma.join(
          scope.sessionIds.map((id) => Prisma.sql`${id}`),
          ', ',
        )})`,
      );
    }
    if (scope.includeNullSession) {
      parts.push(Prisma.sql`p."academic_session_id" IS NULL`);
    }
    const scopeClause =
      parts.length > 0
        ? Prisma.sql`AND (${Prisma.join(parts, ' OR ')})`
        : Prisma.sql`AND FALSE`;

    const rows = await this.prisma.$queryRaw<Numberish[]>`
      SELECT COALESCE(SUM(p."amount" - COALESCE(a.alloc, 0)), 0) AS n
      FROM "payments" p
      LEFT JOIN (
        SELECT "payment_id", SUM("amount") AS alloc
        FROM "invoice_payment_allocations"
        GROUP BY "payment_id"
      ) a ON a."payment_id" = p.id
      WHERE p."student_id" = ${studentId}
        AND p."status" = 'COMPLETED'
        ${scopeClause}`;
    return Number(rows[0]?.n ?? 0);
  }

  async list(params: FeeStatementListParams) {
    const scope = await this.resolveScope(params);
    const searchClause = params.search
      ? Prisma.sql`AND (u."name" ILIKE ${`%${params.search}%`}
        OR s."admission_number" ILIKE ${`%${params.search}%`})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        admissionNumber: string | null;
        name: string;
        courseCode: string | null;
        invoiced: string | number | bigint;
        paid: string | number | bigint;
      }[]
    >`
      SELECT s.id, s."admission_number" AS "admissionNumber", u.name,
        c.code AS "courseCode",
        COALESCE(SUM(CASE
          WHEN e.type = 'INVOICE' THEN e."debit"
          WHEN e.type = 'INVOICE_REVERSAL' THEN -e."credit"
          ELSE 0 END), 0) AS invoiced,
        COALESCE(SUM(CASE
          WHEN e.type = 'PAYMENT' THEN e."credit"
          WHEN e.type = 'PAYMENT_REVERSAL' THEN -e."debit"
          ELSE 0 END), 0) AS paid
      FROM "student_profiles" s
      JOIN "users" u ON u.id = s."user_id"
      LEFT JOIN "courses" c ON c.id = s."course_id"
      LEFT JOIN "student_ledger_entries" e
        ON e."student_id" = s.id AND ${this.ledgerSessionWhere(scope, 'e')}
      WHERE s."deleted_at" IS NULL ${searchClause}
      GROUP BY s.id, s."admission_number", u.name, c.code
      ORDER BY (
        COALESCE(SUM(CASE
          WHEN e.type = 'INVOICE' THEN e."debit"
          WHEN e.type = 'INVOICE_REVERSAL' THEN -e."credit"
          ELSE 0 END), 0)
        - COALESCE(SUM(CASE
          WHEN e.type = 'PAYMENT' THEN e."credit"
          WHEN e.type = 'PAYMENT_REVERSAL' THEN -e."debit"
          ELSE 0 END), 0)
      ) DESC, u.name ASC
      LIMIT ${params.limit} OFFSET ${(params.page - 1) * params.limit}`;

    const total = await this.prisma.$queryRaw<Numberish[]>`
      SELECT COUNT(*) AS n
      FROM "student_profiles" s
      JOIN "users" u ON u.id = s."user_id"
      WHERE s."deleted_at" IS NULL ${searchClause}`;

    return {
      items: rows.map((row) => {
        const invoiced = Number(row.invoiced);
        const paid = Number(row.paid);
        return {
          id: row.id,
          admissionNumber: row.admissionNumber,
          name: row.name,
          courseCode: row.courseCode,
          invoiced,
          paid,
          balance: invoiced - paid,
        };
      }),
      total: Number(total[0]?.n ?? 0),
      page: params.page,
      limit: params.limit,
      scope: this.scopeSummary(scope),
    };
  }

  private scopeSummary(scope: StatementScope) {
    return {
      mode: scope.mode,
      academicYearId: scope.academicYearId,
      academicYearName: scope.academicYearName,
      sessionIds: scope.sessionIds,
      includeNullSession: scope.includeNullSession,
      label: scope.label,
      activeSessionId: scope.activeSessionId,
    };
  }

  async statementDetail(
    studentId: number,
    params: FeeStatementDetailParams,
  ): Promise<StatementPdfData> {
    const scope = await this.resolveScope(params);

    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const or: Prisma.StudentLedgerEntryWhereInput[] = [];
    if (scope.sessionIds.length > 0) {
      or.push({ academicSessionId: { in: scope.sessionIds } });
    }
    if (scope.includeNullSession) {
      or.push({ academicSessionId: null });
    }

    const entries = await this.prisma.studentLedgerEntry.findMany({
      where: {
        studentId,
        OR: or.length > 0 ? or : [{ academicSessionId: -1 }],
      },
      orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
      include: {
        academicSession: { select: { id: true, name: true } },
        invoice: { select: { invoiceNumber: true } },
        payment: { select: { reference: true } },
      },
    });

    const labelById = new Map<number, string>();
    for (const s of scope.sessions ?? []) labelById.set(s.id, s.name);
    const sessionLabel = (id: number | null): string =>
      id != null ? (labelById.get(id) ?? 'Other Transactions') : 'Other Transactions';

    let running = 0;
    const sequence = new Map<string, number>();
    const transactions = entries.map((entry) => {
      const key = entry.academicSessionId?.toString() ?? 'other';
      sequence.set(key, (sequence.get(key) ?? 0) + 1);
      const debit = Number(entry.debit);
      const credit = Number(entry.credit);
      running = running + debit - credit;
      return {
        number: sequence.get(key)!,
        date: entry.transactionDate,
        reference:
          entry.reference ??
          entry.invoice?.invoiceNumber ??
          entry.payment?.reference ??
          '',
        description: entry.description ?? TYPE_LABELS[entry.type],
        type: entry.type,
        debit,
        credit,
        balance: running,
        academicSessionId: entry.academicSessionId,
        sessionLabel: sessionLabel(entry.academicSessionId),
      };
    });

    const breakdownMap = new Map<
      string,
      { sessionName: string; fees: number; paid: number }
    >();
    for (const t of transactions) {
      const key = t.academicSessionId?.toString() ?? 'other';
      if (!breakdownMap.has(key)) {
        breakdownMap.set(key, { sessionName: t.sessionLabel, fees: 0, paid: 0 });
      }
      const bucket = breakdownMap.get(key)!;
      if (t.type === 'INVOICE') bucket.fees += t.debit;
      else if (t.type === 'INVOICE_REVERSAL') bucket.fees -= t.credit;
      else if (t.type === 'PAYMENT') bucket.paid += t.credit;
      else if (t.type === 'PAYMENT_REVERSAL') bucket.paid -= t.debit;
    }

    const sessionBreakdown = Array.from(breakdownMap.values()).map((bucket) => ({
      sessionName: bucket.sessionName,
      fees: bucket.fees,
      paid: bucket.paid,
      outstanding: bucket.fees - bucket.paid,
    }));

    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
    const totalInvoiced = sessionBreakdown.reduce((sum, b) => sum + b.fees, 0);
    const totalPaid = sessionBreakdown.reduce((sum, b) => sum + b.paid, 0);
    const ledgerBalance = totalDebit - totalCredit;
    const unallocated = await this.resolveUnallocated(studentId, scope);

    return {
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        name: student.user.name,
        email: student.user.email,
        phone: student.user.phone,
        level: student.level,
        admissionYear: student.admDate ? student.admDate.getFullYear() : null,
        studentType: student.status,
      },
      course: student.course
        ? { code: student.course.code, name: student.course.name }
        : null,
      department: student.course?.department
        ? { name: student.course.department.name }
        : null,
      scope: this.scopeSummary(scope),
      transactions,
      sessionBreakdown,
      summary: {
        totalDebit,
        totalCredit,
        totalInvoiced,
        totalPaid,
        outstandingBalance: Math.max(totalInvoiced - totalPaid, 0),
        creditBalance: Math.max(totalPaid - totalInvoiced, 0),
        unallocated,
        ledgerBalance,
      },
    };
  }

  async generatePdf(
    studentId: number,
    params: FeeStatementDetailParams,
  ): Promise<Buffer> {
    const data = await this.statementDetail(studentId, params);
    return renderStatementPdf(data);
  }
}
