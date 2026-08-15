import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FeeStatus,
  InvoiceStatus,
  InvoiceType,
  LedgerEntryType,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateAdhocInvoiceDto } from './dto/create-adhoc-invoice.dto';
import { ReverseInvoiceDto } from './dto/reverse-invoice.dto';

const DEFAULT_DUE_DAYS = 30;

const INVOICE_INCLUDE = {
  student: {
    select: {
      id: true,
      admissionNumber: true,
      user: { select: { id: true, name: true } },
    },
  },
  feeStructure: { select: { id: true, feeName: true } },
  academicYear: { select: { id: true, name: true } },
  academicSession: { select: { id: true, name: true } },
  course: { select: { id: true, name: true, code: true } },
  curriculum: { select: { id: true, cycleName: true } },
} satisfies Prisma.InvoiceInclude;

const INVOICE_WITH_ITEMS_INCLUDE = {
  ...INVOICE_INCLUDE,
  items: { orderBy: { id: 'asc' } },
} satisfies Prisma.InvoiceInclude;

type InvoiceRow = Prisma.InvoiceGetPayload<{
  include: typeof INVOICE_INCLUDE;
}>;
type InvoiceWithItems = Prisma.InvoiceGetPayload<{
  include: typeof INVOICE_WITH_ITEMS_INCLUDE;
}>;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toView(row: InvoiceRow | InvoiceWithItems, paid = new Prisma.Decimal(0)) {
  const isCancelled = row.status === InvoiceStatus.CANCELLED;
  const paidAmount = isCancelled ? new Prisma.Decimal(0) : paid;
  const view: Record<string, unknown> = {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    studentId: row.studentId,
    studentName: row.student.user.name,
    studentAdmissionNumber: row.student.admissionNumber,
    courseId: row.courseId,
    courseName: row.course?.name ?? null,
    courseCode: row.course?.code ?? null,
    courseCurriculumId: row.courseCurriculumId,
    curriculumId: row.curriculumId,
    curriculumName: row.curriculum?.cycleName ?? null,
    academicYearId: row.academicYearId,
    academicYearName: row.academicYear?.name ?? null,
    academicSessionId: row.academicSessionId,
    academicSessionName: row.academicSession?.name ?? null,
    feeStructureId: row.feeStructureId,
    feeStructureName: row.feeStructure?.feeName ?? null,
    type: row.type,
    chargeType: row.chargeType ?? null,
    status: row.status,
    amountDue: Number(row.amountDue),
    computedAmount: Number(row.computedAmount),
    paidAmount: Number(paidAmount),
    balance: isCancelled
      ? 0
      : Math.max(Number(row.computedAmount) - Number(paidAmount), 0),
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    notes: row.notes,
    reason: row.reason,
    reversedAt: row.reversedAt,
    reversedBy: row.reversedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  const items = (row as InvoiceWithItems).items;
  if (items) {
    view.items = items.map((item) => ({
      id: item.id,
      feeItemId: item.feeItemId,
      itemName: item.itemName,
      description: item.description,
      amount: Number(item.amount),
      quantity: item.quantity,
      totalAmount: Number(item.totalAmount),
    }));
  }
  return view;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    studentId?: number;
    status?: string;
    type?: string;
    academicSessionId?: number;
    academicYearId?: number;
  }) {
    const { page, limit } = params;
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.academicSessionId
        ? { academicSessionId: params.academicSessionId }
        : {}),
      ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
      ...(params.status ? { status: params.status as InvoiceStatus } : {}),
      ...(params.type ? { type: params.type as InvoiceType } : {}),
      ...(params.search
        ? {
            OR: [
              { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
              {
                student: {
                  admissionNumber: {
                    contains: params.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                student: {
                  user: { name: { contains: params.search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: INVOICE_INCLUDE,
        orderBy: [{ issueDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items: await this.attachPaidAmounts(rows), total, page, limit };
  }

  async findOneById(id: number) {
    const row = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: INVOICE_WITH_ITEMS_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(`Invoice with id '${id}' not found`);
    }
    return (await this.attachPaidAmounts([row]))[0];
  }

  /** Preview what a template invoice would look like for a student. */
  async preview(params: { studentId: number; academicSessionId?: number }) {
    const student = await this.resolveStudentForFinance(params.studentId);
    if (!student) {
      throw new NotFoundException(`Student with id '${params.studentId}' not found`);
    }

    const enrolment = student.courseEnrolments[0] ?? null;
    if (!enrolment) {
      throw new BadRequestException(
        'Student has no active course enrolment — cannot resolve a fee template.',
      );
    }
    const cc = enrolment.courseCurriculum;
    const sessionId = params.academicSessionId ?? enrolment.academicSessionId ?? null;
    if (!sessionId) {
      throw new BadRequestException('Student has no academic session.');
    }

    const session =
      sessionId === enrolment.academicSessionId
        ? enrolment.academicSession
        : await this.prisma.academicSession.findFirst({
            where: { id: sessionId },
            select: { id: true, name: true, academicYearId: true },
          });
    if (!session) {
      throw new BadRequestException(`Academic session with id '${sessionId}' not found`);
    }

    const assignment = await this.prisma.courseFeeAssignment.findFirst({
      where: {
        deletedAt: null,
        status: FeeStatus.ACTIVE,
        courseId: cc.courseId,
        curriculumId: cc.curriculumId,
        academicSessionId: sessionId,
      },
      select: {
        id: true,
        feeStructure: {
          select: {
            id: true,
            feeName: true,
            items: {
              orderBy: { displayOrder: 'asc' },
              select: { id: true, itemName: true, amount: true },
            },
          },
        },
      },
    });

    const base = {
      student: {
        id: student.id,
        name: student.user.name,
        admissionNumber: student.admissionNumber,
      },
      enrolment: {
        courseId: cc.courseId,
        courseName: cc.course.name,
        courseCode: cc.course.code,
        curriculumId: cc.curriculumId,
        curriculumName: cc.curriculum.cycleName,
        academicSessionId: session.id,
        academicSessionName: session.name,
        academicYearId: session.academicYearId,
      },
    };

    if (!assignment) {
      return { ...base, assignment: null, items: [], amountDue: 0 };
    }

    const existing = await this.prisma.invoice.findFirst({
      where: {
        deletedAt: null,
        studentId: student.id,
        academicSessionId: sessionId,
        feeStructureId: assignment.feeStructure.id,
        status: { not: InvoiceStatus.CANCELLED },
      },
      select: { id: true, invoiceNumber: true, status: true },
    });

    const total = assignment.feeStructure.items.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    );

    return {
      ...base,
      assignment: {
        id: assignment.id,
        feeStructureId: assignment.feeStructure.id,
        feeStructureName: assignment.feeStructure.feeName,
      },
      items: assignment.feeStructure.items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        amount: Number(item.amount),
      })),
      amountDue: Number(total),
      existingInvoice: existing,
    };
  }

  async createFromTemplate(dto: CreateInvoiceDto, actorId: number) {
    const student = await this.resolveStudentForFinance(dto.studentId);
    if (!student) {
      throw new NotFoundException(`Student with id '${dto.studentId}' not found`);
    }

    const enrolment = student.courseEnrolments[0] ?? null;
    if (!enrolment) {
      throw new BadRequestException(
        'Student has no active course enrolment — cannot invoice a fee template.',
      );
    }
    const cc = enrolment.courseCurriculum;

    const sessionId = dto.academicSessionId ?? enrolment.academicSessionId ?? null;
    if (!sessionId) {
      throw new BadRequestException(
        'Student has no academic session — cannot resolve a fee assignment.',
      );
    }
    const session = await this.prisma.academicSession.findFirst({
      where: { id: sessionId },
      select: { id: true, academicYearId: true },
    });
    if (!session) {
      throw new BadRequestException(`Academic session with id '${sessionId}' not found`);
    }

    const assignment = await this.prisma.courseFeeAssignment.findFirst({
      where: {
        deletedAt: null,
        status: FeeStatus.ACTIVE,
        courseId: cc.courseId,
        curriculumId: cc.curriculumId,
        academicSessionId: sessionId,
      },
      include: {
        feeStructure: {
          include: { items: { orderBy: { displayOrder: 'asc' } } },
        },
      },
    });
    if (!assignment) {
      throw new NotFoundException(
        "No active fee assignment found for this student's course, curriculum and academic session.",
      );
    }
    const structure = assignment.feeStructure;
    const items = structure.items.filter((item) => item.amount.gt(0));
    if (items.length === 0) {
      throw new BadRequestException(
        `Fee structure '${structure.feeName}' has no billable items.`,
      );
    }

    const existing = await this.prisma.invoice.findFirst({
      where: {
        deletedAt: null,
        studentId: dto.studentId,
        academicSessionId: sessionId,
        feeStructureId: structure.id,
        status: { not: InvoiceStatus.CANCELLED },
      },
      select: { id: true, invoiceNumber: true },
    });
    if (existing) {
      throw new ConflictException(
        `Student already has an active invoice for this fee structure and session: ${existing.invoiceNumber}.`,
      );
    }

    const issueDate = new Date();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : addDays(issueDate, DEFAULT_DUE_DAYS);
    const total = items.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    );

    const invoice = await this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.nextInvoiceNumber(
        tx,
        issueDate.getFullYear(),
      );
      const row = await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId: student.id,
          courseId: cc.courseId,
          courseCurriculumId: cc.id,
          curriculumId: cc.curriculumId,
          academicYearId: session.academicYearId,
          academicSessionId: sessionId,
          feeStructureId: structure.id,
          type: InvoiceType.FEES,
          status: InvoiceStatus.ISSUED,
          amountDue: total,
          computedAmount: total,
          issueDate,
          dueDate,
          notes: dto.notes ?? null,
          createdBy: actorId,
          items: {
            create: items.map((item) => ({
              feeItemId: item.id,
              itemName: item.itemName,
              amount: item.amount,
              quantity: 1,
              totalAmount: item.amount,
              snapshot: {
                source: 'fee_structure',
                feeStructureId: structure.id,
                feeStructureName: structure.feeName,
                feeItemId: item.id,
                displayOrder: item.displayOrder,
              },
            })),
          },
        },
        include: INVOICE_WITH_ITEMS_INCLUDE,
      });

      await tx.studentLedgerEntry.create({
        data: {
          studentId: student.id,
          invoiceId: row.id,
          academicSessionId: sessionId,
          type: LedgerEntryType.INVOICE,
          debit: total,
          credit: new Prisma.Decimal(0),
          reference: invoiceNumber,
          description: `Invoice ${invoiceNumber} issued (${structure.feeName})`,
          transactionDate: issueDate,
          createdBy: actorId,
        },
      });
      return row;
    });

    await this.audit.log('invoice.create', actorId, 'Invoice', invoice.id, {
      newValues: {
        invoiceNumber: invoice.invoiceNumber,
        studentId: student.id,
        feeStructureId: structure.id,
        amount: Number(total),
      },
    });

    return toView(invoice);
  }

  async createAdhoc(dto: CreateAdhocInvoiceDto, actorId: number) {
    const student = await this.resolveStudentForFinance(dto.studentId);
    if (!student) {
      throw new NotFoundException(`Student with id '${dto.studentId}' not found`);
    }

    const enrolment = student.courseEnrolments[0] ?? null;
    const cc = enrolment?.courseCurriculum ?? null;

    for (const line of dto.items) {
      if (!line.itemName.trim() || line.amount <= 0) {
        throw new BadRequestException(
          'Each ad-hoc line must have an item name and a positive amount.',
        );
      }
    }
    const total = dto.items.reduce(
      (sum, line) =>
        sum.plus(new Prisma.Decimal(line.amount).mul(line.quantity ?? 1)),
      new Prisma.Decimal(0),
    );

    const sessionId = dto.academicSessionId ?? enrolment?.academicSessionId ?? null;
    let yearId: number | null = null;
    if (sessionId) {
      const session = await this.prisma.academicSession.findFirst({
        where: { id: sessionId },
        select: { academicYearId: true },
      });
      if (!session) {
        throw new BadRequestException(`Academic session with id '${sessionId}' not found`);
      }
      yearId = session.academicYearId;
    }

    const issueDate = new Date();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : addDays(issueDate, DEFAULT_DUE_DAYS);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.nextInvoiceNumber(
        tx,
        issueDate.getFullYear(),
      );
      const row = await tx.invoice.create({
        data: {
          invoiceNumber,
          studentId: student.id,
          courseId: cc?.courseId ?? null,
          courseCurriculumId: cc?.id ?? null,
          curriculumId: cc?.curriculumId ?? null,
          academicYearId: yearId,
          academicSessionId: sessionId ?? null,
          type: InvoiceType.ADHOC,
          chargeType: dto.chargeType,
          status: InvoiceStatus.ISSUED,
          amountDue: total,
          computedAmount: total,
          issueDate,
          dueDate,
          notes: dto.notes ?? null,
          createdBy: actorId,
          items: {
            create: dto.items.map((line) => ({
              feeItemId: null,
              itemName: line.itemName.trim(),
              description: line.description ?? null,
              amount: new Prisma.Decimal(line.amount),
              quantity: line.quantity ?? 1,
              totalAmount: new Prisma.Decimal(line.amount).mul(
                line.quantity ?? 1,
              ),
              snapshot: {
                source: 'adhoc',
                chargeType: dto.chargeType,
              },
            })),
          },
        },
        include: INVOICE_WITH_ITEMS_INCLUDE,
      });

      await tx.studentLedgerEntry.create({
        data: {
          studentId: student.id,
          invoiceId: row.id,
          academicSessionId: sessionId ?? null,
          type: LedgerEntryType.INVOICE,
          debit: total,
          credit: new Prisma.Decimal(0),
          reference: invoiceNumber,
          description: `Invoice ${invoiceNumber} issued (${dto.chargeType})`,
          transactionDate: issueDate,
          createdBy: actorId,
        },
      });
      return row;
    });

    await this.audit.log('invoice.create', actorId, 'Invoice', invoice.id, {
      newValues: {
        invoiceNumber: invoice.invoiceNumber,
        studentId: student.id,
        type: 'adhoc',
        chargeType: dto.chargeType,
        amount: Number(total),
      },
    });

    return toView(invoice);
  }

  async reverse(id: number, dto: ReverseInvoiceDto, actorId: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with id '${id}' not found`);
    }
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Invoice is already cancelled.');
    }

    const activeAllocation = await this.prisma.invoicePaymentAllocation.findFirst({
      where: { invoiceId: id, payment: { status: PaymentStatus.COMPLETED } },
      select: { id: true },
    });
    if (activeAllocation) {
      throw new ConflictException(
        'This invoice has payments applied to it. Reverse those payment(s) first, then reverse the invoice.',
      );
    }

    const reversed = await this.prisma.$transaction(async (tx) => {
      const row = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.CANCELLED,
          reason: dto.reason,
          reversedAt: new Date(),
          reversedBy: actorId,
        },
        include: INVOICE_WITH_ITEMS_INCLUDE,
      });

      await tx.studentLedgerEntry.create({
        data: {
          studentId: row.studentId,
          invoiceId: row.id,
          academicSessionId: row.academicSessionId,
          type: LedgerEntryType.INVOICE_REVERSAL,
          debit: new Prisma.Decimal(0),
          credit: row.computedAmount,
          reference: row.invoiceNumber,
          description: `Invoice ${row.invoiceNumber} reversed: ${dto.reason}`,
          transactionDate: new Date(),
          createdBy: actorId,
        },
      });
      return row;
    });

    await this.audit.log('invoice.reverse', actorId, 'Invoice', id, {
      newValues: { reason: dto.reason },
    });

    return toView(reversed);
  }

  /** Student statement: ledger entries plus running totals. */
  async statement(studentId: number, academicSessionId?: number) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, deletedAt: null },
      select: {
        id: true,
        admissionNumber: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!student) {
      throw new NotFoundException(`Student with id '${studentId}' not found`);
    }

    const entries = await this.prisma.studentLedgerEntry.findMany({
      where: {
        studentId,
        ...(academicSessionId ? { academicSessionId } : {}),
      },
      orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
    });

    const totals = {
      invoiced: new Prisma.Decimal(0),
      paid: new Prisma.Decimal(0),
      adjustments: new Prisma.Decimal(0),
      balance: new Prisma.Decimal(0),
    };
    for (const entry of entries) {
      if (entry.type === LedgerEntryType.INVOICE)
        totals.invoiced = totals.invoiced.plus(entry.debit);
      else if (entry.type === LedgerEntryType.INVOICE_REVERSAL)
        totals.invoiced = totals.invoiced.minus(entry.credit);
      else if (entry.type === LedgerEntryType.PAYMENT)
        totals.paid = totals.paid.plus(entry.credit);
      else if (entry.type === LedgerEntryType.PAYMENT_REVERSAL)
        totals.paid = totals.paid.minus(entry.debit);
    }
    totals.balance = totals.invoiced.minus(totals.paid);

    const unallocated = await this.unallocatedBalance(studentId, academicSessionId);
    const creditBalance = totals.balance.lt(0)
      ? totals.balance.abs()
      : new Prisma.Decimal(0);

    return {
      student: {
        id: student.id,
        name: student.user.name,
        admissionNumber: student.admissionNumber,
      },
      totals: {
        invoiced: Number(totals.invoiced),
        paid: Number(totals.paid),
        adjustments: Number(totals.adjustments),
        balance: Number(totals.balance),
        creditBalance: Number(creditBalance),
        unallocated: Number(unallocated),
      },
      entries: entries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        reference: entry.reference,
        description: entry.description,
        transactionDate: entry.transactionDate,
        createdAt: entry.createdAt,
      })),
    };
  }

  /**
   * Total of payment amounts not yet allocated to any invoice (a credit on
   * account). Computed in SQL so it scales with the ledger size.
   */
  private async unallocatedBalance(studentId: number, academicSessionId?: number) {
    const rows = await this.prisma.$queryRaw<{ unallocated: Prisma.Decimal }[]>`
      SELECT COALESCE(
        SUM(p.amount - COALESCE(alloc.allocated, 0)),
        0
      ) AS unallocated
      FROM payments p
      LEFT JOIN (
        SELECT payment_id, SUM(amount) AS allocated
        FROM invoice_payment_allocations
        GROUP BY payment_id
      ) alloc ON alloc.payment_id = p.id
      WHERE p.student_id = ${studentId}
        AND p.status = 'COMPLETED'
        ${academicSessionId ? Prisma.sql`AND p.academic_session_id = ${academicSessionId}` : Prisma.empty}`;
    return new Prisma.Decimal(rows[0]?.unallocated?.toString() ?? '0');
  }

  /** INV-{year}-{0001} — monotonically increasing, never reused after soft deletes. */
  private async nextInvoiceNumber(
    tx: Prisma.TransactionClient,
    year: number,
  ): Promise<string> {
    await tx.invoiceSequence.upsert({
      where: { year },
      create: { year },
      update: {},
    });
    const rows = await tx.$queryRaw<{ last_value: number }[]>`
      UPDATE "invoice_sequences"
      SET "last_value" = "last_value" + 1
      WHERE "year" = ${year}
      RETURNING "last_value"`;
    const lastValue = rows[0]?.last_value ?? 1;
    return `INV-${year}-${String(lastValue).padStart(4, '0')}`;
  }

  /**
   * Loads a student with their most recent (non-deleted) course enrolment,
   * including the course/curriculum mapping and academic session. Shared by
   * preview, template-creation and ad-hoc invoicing so the resolution rules
   * stay in one place.
   */
  private async resolveStudentForFinance(studentId: number) {
    return this.prisma.studentProfile.findFirst({
      where: { id: studentId, deletedAt: null },
      include: {
        user: { select: { id: true, name: true } },
        courseEnrolments: {
          where: { deletedAt: null },
          orderBy: { id: 'desc' },
          take: 1,
          include: {
            courseCurriculum: {
              include: {
                course: { select: { id: true, name: true, code: true } },
                curriculum: { select: { id: true, cycleName: true } },
              },
            },
            academicSession: {
              select: { id: true, name: true, academicYearId: true },
            },
          },
        },
      },
    });
  }

  private async attachPaidAmounts(rows: InvoiceRow[]) {
    if (rows.length === 0) return [];
    const allocations = await this.prisma.invoicePaymentAllocation.findMany({
      where: {
        invoiceId: { in: rows.map((row) => row.id) },
        payment: { status: PaymentStatus.COMPLETED },
      },
      select: { invoiceId: true, amount: true },
    });
    const paidByInvoice = new Map<number, Prisma.Decimal>();
    for (const allocation of allocations) {
      paidByInvoice.set(
        allocation.invoiceId,
        (paidByInvoice.get(allocation.invoiceId) ?? new Prisma.Decimal(0)).plus(
          allocation.amount,
        ),
      );
    }
    return rows.map((row) =>
      toView(row, paidByInvoice.get(row.id) ?? new Prisma.Decimal(0)),
    );
  }
}
