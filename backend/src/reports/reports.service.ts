import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Numberish = { n?: string | number | bigint; c?: number | bigint; p?: string | number | bigint };

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Billed, collected, outstanding and credit totals for a context. */
  async financeOverview(params: {
    academicYearId?: number;
    academicSessionId?: number;
  }) {
    const invoiceScope = Prisma.sql`i."deleted_at" IS NULL AND i."status" <> 'CANCELLED'`;
    const yearOnInvoice = params.academicYearId
      ? Prisma.sql`AND i."academic_year_id" = ${params.academicYearId}`
      : Prisma.empty;
    const sessionOnInvoice = params.academicSessionId
      ? Prisma.sql`AND i."academic_session_id" = ${params.academicSessionId}`
      : Prisma.empty;

    const paymentWhere: Prisma.Sql[] = [Prisma.sql`p."status" = 'COMPLETED'`];
    if (params.academicSessionId) {
      paymentWhere.push(Prisma.sql`p."academic_session_id" = ${params.academicSessionId}`);
    }
    if (params.academicYearId) {
      paymentWhere.push(
        Prisma.sql`p."academic_session_id" IN (SELECT id FROM "academic_sessions" WHERE "academic_year_id" = ${params.academicYearId})`,
      );
    }
    const paymentScope = Prisma.sql`${Prisma.join(paymentWhere, ' AND ')}`;

    const [billedApplied, cash, byStatus] = await this.prisma.$transaction([
      this.prisma.$queryRaw<Numberish[]>`
        SELECT COALESCE(SUM(i."computed_amount"), 0) AS n, COUNT(*) AS c,
          COALESCE(SUM(a.paid), 0) AS p
        FROM "invoices" i
        LEFT JOIN (
          SELECT x."invoice_id", SUM(x."amount") AS paid
          FROM "invoice_payment_allocations" x
          JOIN "payments" pm ON pm.id = x."payment_id" AND pm."status" = 'COMPLETED'
          GROUP BY x."invoice_id"
        ) a ON a."invoice_id" = i.id
        WHERE ${invoiceScope} ${yearOnInvoice} ${sessionOnInvoice}`,
      this.prisma.$queryRaw<Numberish[]>`
        SELECT COALESCE(SUM(p."amount"), 0) AS n, COUNT(*) AS c
        FROM "payments" p
        WHERE ${paymentScope}`,
      this.prisma.$queryRaw<{ status: string; c: number | bigint }[]>`
        SELECT i."status", COUNT(*) AS c
        FROM "invoices" i
        WHERE ${invoiceScope} ${yearOnInvoice} ${sessionOnInvoice}
        GROUP BY i."status"`,
    ]);

    const billedTotal = Number(billedApplied[0]?.n ?? 0);
    const appliedTotal = Number(billedApplied[0]?.p ?? 0);
    const cashTotal = Number(cash[0]?.n ?? 0);

    return {
      billed: billedTotal,
      collected: appliedTotal,
      outstanding: Math.max(billedTotal - appliedTotal, 0),
      credit: Math.max(cashTotal - appliedTotal, 0),
      cashCollected: cashTotal,
      collectionRate: billedTotal > 0 ? appliedTotal / billedTotal : 0,
      invoiceCounts: Object.fromEntries(
        byStatus.map((row) => [row.status, Number(row.c) ?? 0]),
      ),
      invoiceCount: Number(billedApplied[0]?.c ?? 0),
      paymentCount: Number(cash[0]?.c ?? 0),
    };
  }

  /** Ageing of outstanding balances by days past due. */
  async financeAging(params: { academicSessionId?: number }) {
    const session = params.academicSessionId
      ? Prisma.sql`AND i."academic_session_id" = ${params.academicSessionId}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      { bucket: string; c: number | bigint; n: string | number }[]
    >`
      SELECT
        CASE
          WHEN i."due_date" >= CURRENT_DATE THEN 'current'
          WHEN i."due_date" >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30'
          WHEN i."due_date" >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60'
          WHEN i."due_date" >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90'
          ELSE '90+'
        END AS bucket,
        COUNT(*) AS c,
        COALESCE(SUM(i."computed_amount" - COALESCE(a.paid, 0)), 0) AS n
      FROM "invoices" i
      LEFT JOIN (
        SELECT x."invoice_id", SUM(x."amount") AS paid
        FROM "invoice_payment_allocations" x
        JOIN "payments" p ON p.id = x."payment_id" AND p."status" = 'COMPLETED'
        GROUP BY x."invoice_id"
      ) a ON a."invoice_id" = i.id
      WHERE i."deleted_at" IS NULL
        AND i."status" <> 'CANCELLED'
        AND (i."computed_amount" - COALESCE(a.paid, 0)) > 0
        ${session}
      GROUP BY bucket`;
    const order = ['current', '1-30', '31-60', '61-90', '90+'];
    return order.map((bucket) => {
      const row = rows.find((r) => r.bucket === bucket);
      return { bucket, count: Number(row?.c ?? 0), amount: Number(row?.n ?? 0) };
    });
  }

  /** Daily collection totals, optionally split by payment method. */
  async financeCollections(params: {
    from?: string;
    to?: string;
    method?: PaymentMethod;
    academicSessionId?: number;
  }) {
    const clauses: Prisma.Sql[] = [Prisma.sql`p."status" = 'COMPLETED'`];
    if (params.from) clauses.push(Prisma.sql`p."payment_date" >= ${new Date(params.from)}`);
    if (params.to) clauses.push(Prisma.sql`p."payment_date" <= ${new Date(params.to)}`);
    if (params.method) clauses.push(Prisma.sql`p."method"::text = ${params.method}`);
    if (params.academicSessionId) {
      clauses.push(Prisma.sql`p."academic_session_id" = ${params.academicSessionId}`);
    }
    const rows = await this.prisma.$queryRaw<
      { payment_date: Date; method: PaymentMethod; c: number | bigint; n: string | number }[]
    >`
      SELECT p."payment_date", p."method", COUNT(*) AS c, COALESCE(SUM(p."amount"), 0) AS n
      FROM "payments" p
      WHERE ${Prisma.join(clauses, ' AND ')}
      GROUP BY p."payment_date", p."method"
      ORDER BY p."payment_date" ASC`;
    return rows.map((row) => ({
      date: row.payment_date,
      method: row.method,
      count: Number(row.c),
      amount: Number(row.n),
    }));
  }

  /** Students with an outstanding balance, most-indebted first. */
  async financeDefaulters(params: {
    academicSessionId?: number;
    page: number;
    limit: number;
  }) {
    const session = params.academicSessionId
      ? Prisma.sql`AND i."academic_session_id" = ${params.academicSessionId}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        admissionNumber: string | null;
        name: string;
        email: string;
        n: string | number;
      }[]
    >`
      SELECT s.id, s."admission_number", u.name, u.email,
        COALESCE(SUM(i."computed_amount" - COALESCE(a.paid, 0)), 0) AS n
      FROM "student_profiles" s
      JOIN "users" u ON u.id = s."user_id"
      JOIN "invoices" i ON i."student_id" = s.id
        AND i."deleted_at" IS NULL AND i."status" <> 'CANCELLED'
        ${session}
      LEFT JOIN (
        SELECT x."invoice_id", SUM(x."amount") AS paid
        FROM "invoice_payment_allocations" x
        JOIN "payments" p ON p.id = x."payment_id" AND p."status" = 'COMPLETED'
        GROUP BY x."invoice_id"
      ) a ON a."invoice_id" = i.id
      GROUP BY s.id, s."admission_number", u.name, u.email
      HAVING COALESCE(SUM(i."computed_amount" - COALESCE(a.paid, 0)), 0) > 0
      ORDER BY n DESC
      LIMIT ${params.limit} OFFSET ${(params.page - 1) * params.limit}`;
    const total = await this.prisma.$queryRaw<Numberish[]>`
      SELECT COUNT(*) AS n FROM (
        SELECT s.id
        FROM "student_profiles" s
        JOIN "invoices" i ON i."student_id" = s.id
          AND i."deleted_at" IS NULL AND i."status" <> 'CANCELLED'
          ${session}
        LEFT JOIN (
          SELECT x."invoice_id", SUM(x."amount") AS paid
          FROM "invoice_payment_allocations" x
          JOIN "payments" p ON p.id = x."payment_id" AND p."status" = 'COMPLETED'
          GROUP BY x."invoice_id"
        ) a ON a."invoice_id" = i.id
        GROUP BY s.id
        HAVING COALESCE(SUM(i."computed_amount" - COALESCE(a.paid, 0)), 0) > 0
      ) t`;
    return {
      items: rows.map((row) => ({
        id: row.id,
        admissionNumber: row.admissionNumber,
        name: row.name,
        email: row.email,
        balance: Number(row.n),
      })),
      total: Number(total[0]?.n ?? 0),
      page: params.page,
      limit: params.limit,
    };
  }

  /** Billed / collected / outstanding per course. */
  async financeCourseSummary(params: {
    academicYearId?: number;
    academicSessionId?: number;
  }) {
    const clauses: Prisma.Sql[] = [
      Prisma.sql`i."deleted_at" IS NULL`,
      Prisma.sql`i."status" <> 'CANCELLED'`,
    ];
    if (params.academicYearId) clauses.push(Prisma.sql`i."academic_year_id" = ${params.academicYearId}`);
    if (params.academicSessionId) clauses.push(Prisma.sql`i."academic_session_id" = ${params.academicSessionId}`);
    const rows = await this.prisma.$queryRaw<
      {
        id: number | null;
        code: string | null;
        name: string | null;
        students: number | bigint;
        billed: string | number;
        collected: string | number;
      }[]
    >`
      SELECT i."course_id" AS id, c.code, c.name,
        COUNT(DISTINCT i."student_id") AS students,
        COALESCE(SUM(i."computed_amount"), 0) AS billed,
        COALESCE(SUM(a.paid), 0) AS collected
      FROM "invoices" i
      LEFT JOIN "courses" c ON c.id = i."course_id"
      LEFT JOIN (
        SELECT x."invoice_id", SUM(x."amount") AS paid
        FROM "invoice_payment_allocations" x
        JOIN "payments" p ON p.id = x."payment_id" AND p."status" = 'COMPLETED'
        GROUP BY x."invoice_id"
      ) a ON a."invoice_id" = i.id
      WHERE ${Prisma.join(clauses, ' AND ')}
      GROUP BY i."course_id", c.code, c.name
      ORDER BY c.name NULLS LAST`;
    return rows.map((row) => {
      const billed = Number(row.billed);
      const collected = Number(row.collected);
      return {
        courseId: row.id,
        courseCode: row.code,
        courseName: row.name,
        students: Number(row.students),
        billed,
        collected,
        outstanding: Math.max(billed - collected, 0),
        collectionRate: billed > 0 ? collected / billed : 0,
      };
    });
  }

  /** Students whose payments exceed their allocations (credit on account). */
  async financeCreditBalances(params: { academicSessionId?: number }) {
    const session = params.academicSessionId
      ? Prisma.sql`AND p."academic_session_id" = ${params.academicSessionId}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        admissionNumber: string | null;
        name: string;
        email: string;
        n: string | number;
      }[]
    >`
      SELECT s.id, s."admission_number", u.name, u.email,
        COALESCE(SUM(p."amount" - COALESCE(a.alloc, 0)), 0) AS n
      FROM "payments" p
      JOIN "student_profiles" s ON s.id = p."student_id"
      JOIN "users" u ON u.id = s."user_id"
      LEFT JOIN (
        SELECT "payment_id", SUM("amount") AS alloc
        FROM "invoice_payment_allocations"
        GROUP BY "payment_id"
      ) a ON a."payment_id" = p.id
      WHERE p."status" = 'COMPLETED'
        ${session}
      GROUP BY s.id, s."admission_number", u.name, u.email
      HAVING COALESCE(SUM(p."amount" - COALESCE(a.alloc, 0)), 0) > 0
      ORDER BY n DESC`;
    return rows.map((row) => ({
      id: row.id,
      admissionNumber: row.admissionNumber,
      name: row.name,
      email: row.email,
      credit: Number(row.n),
    }));
  }

  /** Reversal register — reversed payments and cancelled invoices. */
  async financeReversals(params: { from?: string; to?: string }) {
    const from = params.from ? Prisma.sql`AND r."reversed_at" >= ${new Date(params.from)}` : Prisma.empty;
    const to = params.to ? Prisma.sql`AND r."reversed_at" <= ${new Date(params.to)}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        kind: string;
        id: number;
        reference: string;
        amount: string | number;
        reason: string | null;
        reversedAt: Date;
        reversedByName: string | null;
      }[]
    >`
      SELECT 'payment' AS kind, p.id, COALESCE(p."reference", 'PMT-' || p.id) AS reference,
        p."amount", p."reversal_reason" AS reason, p."reversed_at" AS "reversed_at",
        u.name AS "reversedByName"
      FROM "payments" p
      LEFT JOIN "users" u ON u.id = p."reversed_by"
      WHERE p."status" = 'REVERSED' ${from} ${to}
      UNION ALL
      SELECT 'invoice' AS kind, i.id, i."invoice_number" AS reference,
        i."computed_amount", i.reason, i."reversed_at" AS "reversed_at",
        u.name AS "reversedByName"
      FROM "invoices" i
      LEFT JOIN "users" u ON u.id = i."reversed_by"
      WHERE i."status" = 'CANCELLED' AND i."deleted_at" IS NULL ${from} ${to}
      ORDER BY "reversed_at" DESC`;
    return rows.map((row) => ({
      kind: row.kind,
      id: row.id,
      reference: row.reference,
      amount: Number(row.amount),
      reason: row.reason,
      reversedAt: row.reversedAt,
      reversedByName: row.reversedByName,
    }));
  }
}
