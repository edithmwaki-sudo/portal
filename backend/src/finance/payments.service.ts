import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  LedgerEntryType,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReversePaymentDto } from './dto/reverse-payment.dto';

const PAYMENT_INCLUDE = {
  student: {
    select: {
      id: true,
      admissionNumber: true,
      user: { select: { id: true, name: true } },
    },
  },
  academicSession: { select: { id: true, name: true } },
} satisfies Prisma.PaymentInclude;

const PAYMENT_WITH_ALLOCATIONS_INCLUDE = {
  ...PAYMENT_INCLUDE,
  allocations: {
    orderBy: { id: 'asc' },
    include: { invoice: { select: { id: true, invoiceNumber: true } } },
  },
} satisfies Prisma.PaymentInclude;

type PaymentRow = Prisma.PaymentGetPayload<{
  include: typeof PAYMENT_INCLUDE;
}>;
type PaymentWithAllocations = Prisma.PaymentGetPayload<{
  include: typeof PAYMENT_WITH_ALLOCATIONS_INCLUDE;
}>;

function toView(row: PaymentRow | PaymentWithAllocations) {
  const view: Record<string, unknown> = {
    id: row.id,
    studentId: row.studentId,
    studentName: row.student?.user.name ?? null,
    studentAdmissionNumber: row.student?.admissionNumber ?? null,
    academicSessionId: row.academicSessionId,
    academicSessionName: row.academicSession?.name ?? null,
    amount: Number(row.amount),
    paymentDate: row.paymentDate,
    method: row.method,
    reference: row.reference,
    status: row.status,
    reversedAt: row.reversedAt,
    reversedBy: row.reversedBy,
    reversalReason: row.reversalReason,
    notes: row.notes,
    createdAt: row.createdAt,
  };
  const allocations = (row as PaymentWithAllocations).allocations;
  if (allocations) {
    view.allocations = allocations.map((allocation) => ({
      id: allocation.id,
      invoiceId: allocation.invoiceId,
      invoiceNumber: allocation.invoice?.invoiceNumber ?? null,
      amount: Number(allocation.amount),
      allocatedAt: allocation.allocatedAt,
    }));
  }
  return view;
}

type AllocationPlan = {
  allocations: { invoiceId: number; academicSessionId: number | null; amount: Prisma.Decimal }[];
  totalAllocated: Prisma.Decimal;
};

@Injectable()
export class PaymentsService {
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
    method?: PaymentMethod;
    academicSessionId?: number;
  }) {
    const { page, limit } = params;
    const where: Prisma.PaymentWhereInput = {
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.academicSessionId
        ? { academicSessionId: params.academicSessionId }
        : {}),
      ...(params.status ? { status: params.status as PaymentStatus } : {}),
      ...(params.method ? { method: params.method } : {}),
      ...(params.search
        ? {
            OR: [
              { reference: { contains: params.search, mode: 'insensitive' } },
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
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items: rows.map(toView), total, page, limit };
  }

  async findOneById(id: number) {
    const row = await this.prisma.payment.findFirst({
      where: { id },
      include: PAYMENT_WITH_ALLOCATIONS_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(`Payment with id '${id}' not found`);
    }
    return toView(row);
  }

  async create(dto: CreatePaymentDto, actorId: number) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException(`Student with id '${dto.studentId}' not found`);
    }

    if (dto.academicSessionId) {
      const session = await this.prisma.academicSession.findFirst({
        where: { id: dto.academicSessionId },
        select: { id: true },
      });
      if (!session) {
        throw new BadRequestException(
          `Academic session with id '${dto.academicSessionId}' not found`,
        );
      }
    }

    const amount = new Prisma.Decimal(dto.amount);
    const paymentDate = new Date(dto.paymentDate);

    let payment: Payment;
    try {
      payment = await this.prisma.$transaction(async (tx) => {
        const plan = await this.resolveAllocations(tx, dto, amount);

        const row = await tx.payment.create({
          data: {
            studentId: dto.studentId,
            academicSessionId: dto.academicSessionId ?? null,
            amount,
            paymentDate,
            method: dto.method,
            reference: dto.reference?.trim() ?? null,
            notes: dto.notes ?? null,
            createdBy: actorId,
          },
        });

        for (const allocation of plan.allocations) {
          await tx.invoicePaymentAllocation.create({
            data: {
              paymentId: row.id,
              invoiceId: allocation.invoiceId,
              academicSessionId: allocation.academicSessionId,
              amount: allocation.amount,
            },
          });
        }

        await tx.studentLedgerEntry.create({
          data: {
            studentId: dto.studentId,
            paymentId: row.id,
            academicSessionId: dto.academicSessionId ?? null,
            type: LedgerEntryType.PAYMENT,
            debit: new Prisma.Decimal(0),
            credit: amount,
            reference: dto.reference?.trim() ?? null,
            description: `Payment received (${dto.method})`,
            transactionDate: paymentDate,
            createdBy: actorId,
          },
        });

        await this.recomputeInvoiceStatuses(
          tx,
          plan.allocations.map((allocation) => allocation.invoiceId),
        );
        return row;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `A payment with reference '${dto.reference}' already exists for this student.`,
        );
      }
      throw error;
    }

    await this.audit.log('payment.create', actorId, 'Payment', payment.id, {
      newValues: {
        studentId: dto.studentId,
        amount: Number(amount),
        method: dto.method,
      },
    });

    return this.findOneById(payment.id);
  }

  async reverse(id: number, dto: ReversePaymentDto, actorId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: { id },
      include: {
        allocations: { select: { id: true, invoiceId: true, amount: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException(`Payment with id '${id}' not found`);
    }
    if (payment.status === PaymentStatus.REVERSED) {
      throw new BadRequestException('Payment is already reversed.');
    }
    const studentId = payment.studentId;
    if (studentId == null) {
      throw new BadRequestException('Payment has no student reference.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.REVERSED,
          reversedAt: new Date(),
          reversedBy: actorId,
          reversalReason: dto.reason,
        },
      });
      await tx.studentLedgerEntry.create({
        data: {
          studentId,
          paymentId: id,
          academicSessionId: payment.academicSessionId,
          type: LedgerEntryType.PAYMENT_REVERSAL,
          debit: payment.amount,
          credit: new Prisma.Decimal(0),
          reference: payment.reference,
          description: `Payment reversed: ${dto.reason}`,
          transactionDate: new Date(),
          createdBy: actorId,
        },
      });

      await this.recomputeInvoiceStatuses(
        tx,
        payment.allocations.map((allocation) => allocation.invoiceId),
      );
    });

    await this.audit.log('payment.reverse', actorId, 'Payment', id, {
      newValues: { reason: dto.reason },
    });

    return this.findOneById(id);
  }

  /**
   * Builds the allocation plan for a payment. When explicit allocations are
   * supplied they are validated against outstanding balances; otherwise the
   * payment is auto-allocated FIFO to the student's oldest outstanding
   * invoices (optionally restricted to one academic session).
   *
   * Runs INSIDE the create transaction and takes FOR UPDATE row locks on the
   * affected invoices, so two concurrent payments can never both allocate the
   * same outstanding balance.
   */
  private async resolveAllocations(
    tx: Prisma.TransactionClient,
    dto: CreatePaymentDto,
    amount: Prisma.Decimal,
  ): Promise<AllocationPlan> {
    if (dto.allocations && dto.allocations.length > 0) {
      return this.resolveExplicitAllocations(tx, dto, amount);
    }
    return this.resolveAutoAllocations(tx, dto, amount);
  }

  private async lockInvoices(
    tx: Prisma.TransactionClient,
    invoiceIds: number[],
  ): Promise<void> {
    const unique = [...new Set(invoiceIds)].sort((a, b) => a - b);
    if (unique.length === 0) return;
    await tx.$queryRaw`
      SELECT "id" FROM "invoices"
      WHERE "id" IN (${Prisma.join(unique)})
      FOR UPDATE`;
  }

  private async resolveExplicitAllocations(
    tx: Prisma.TransactionClient,
    dto: CreatePaymentDto,
    amount: Prisma.Decimal,
  ): Promise<AllocationPlan> {
    const ids = dto.allocations!.map((allocation) => allocation.invoiceId);
    await this.lockInvoices(tx, ids);
    const invoices = await tx.invoice.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: {
        id: true,
        studentId: true,
        status: true,
        computedAmount: true,
        academicSessionId: true,
      },
    });
    const paid = await this.allocatedByInvoice(tx, ids);

    let totalAllocated = new Prisma.Decimal(0);
    const allocations: AllocationPlan['allocations'] = [];

    for (const allocation of dto.allocations!) {
      const invoice = invoices.find((item) => item.id === allocation.invoiceId);
      if (!invoice) {
        throw new BadRequestException(
          `Invoice with id '${allocation.invoiceId}' not found`,
        );
      }
      if (invoice.studentId !== dto.studentId) {
        throw new BadRequestException(
          `Invoice ${allocation.invoiceId} does not belong to this student`,
        );
      }
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException(
          `Invoice ${allocation.invoiceId} is cancelled and cannot receive payments`,
        );
      }
      const outstanding = invoice.computedAmount.minus(
        paid.get(invoice.id) ?? new Prisma.Decimal(0),
      );
      if (allocation.amount > outstanding.toNumber()) {
        throw new BadRequestException(
          `Allocation of ${allocation.amount} exceeds the outstanding balance (${Number(outstanding)}) on invoice ${allocation.invoiceId}`,
        );
      }
      totalAllocated = totalAllocated.plus(allocation.amount);
      allocations.push({
        invoiceId: invoice.id,
        academicSessionId: invoice.academicSessionId,
        amount: new Prisma.Decimal(allocation.amount),
      });
    }

    if (totalAllocated.gt(amount)) {
      throw new BadRequestException(
        'Allocations exceed the payment amount.',
      );
    }

    return { allocations, totalAllocated };
  }

  private async resolveAutoAllocations(
    tx: Prisma.TransactionClient,
    dto: CreatePaymentDto,
    amount: Prisma.Decimal,
  ): Promise<AllocationPlan> {
    const invoices = await tx.invoice.findMany({
      where: {
        studentId: dto.studentId,
        deletedAt: null,
        status: { not: InvoiceStatus.CANCELLED },
        ...(dto.academicSessionId ? { academicSessionId: dto.academicSessionId } : {}),
      },
      orderBy: [{ issueDate: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        academicSessionId: true,
        status: true,
        computedAmount: true,
      },
    });
    await this.lockInvoices(
      tx,
      invoices.map((invoice) => invoice.id),
    );
    const paid = await this.allocatedByInvoice(
      tx,
      invoices.map((invoice) => invoice.id),
    );

    const allocations: AllocationPlan['allocations'] = [];
    let remaining = amount;
    for (const invoice of invoices) {
      if (remaining.lte(0)) break;
      const outstanding = invoice.computedAmount.minus(
        paid.get(invoice.id) ?? new Prisma.Decimal(0),
      );
      if (outstanding.lte(0)) continue;
      const toAllocate = remaining.lt(outstanding) ? remaining : outstanding;
      allocations.push({
        invoiceId: invoice.id,
        academicSessionId: invoice.academicSessionId,
        amount: toAllocate,
      });
      remaining = remaining.minus(toAllocate);
    }

    return {
      allocations,
      totalAllocated: amount.minus(remaining),
    };
  }

  private async allocatedByInvoice(tx: Prisma.TransactionClient, invoiceIds: number[]) {
    if (invoiceIds.length === 0) return new Map<number, Prisma.Decimal>();
    const allocations = await tx.invoicePaymentAllocation.findMany({
      where: {
        invoiceId: { in: invoiceIds },
        payment: { status: PaymentStatus.COMPLETED },
      },
      select: { invoiceId: true, amount: true },
    });
    const paid = new Map<number, Prisma.Decimal>();
    for (const allocation of allocations) {
      paid.set(
        allocation.invoiceId,
        (paid.get(allocation.invoiceId) ?? new Prisma.Decimal(0)).plus(
          allocation.amount,
        ),
      );
    }
    return paid;
  }

  /** Recomputes each affected invoice's derived status from its live payments. */
  private async recomputeInvoiceStatuses(
    tx: Prisma.TransactionClient,
    invoiceIds: number[],
  ) {
    const unique = [...new Set(invoiceIds)];
    if (unique.length === 0) return;
    const invoices = await tx.invoice.findMany({
      where: { id: { in: unique } },
      select: { id: true, status: true, computedAmount: true },
    });
    const paid = await this.allocatedByInvoice(tx, unique);

    for (const invoice of invoices) {
      if (invoice.status === InvoiceStatus.CANCELLED) continue;
      const paidAmount = paid.get(invoice.id) ?? new Prisma.Decimal(0);
      let nextStatus: InvoiceStatus = InvoiceStatus.ISSUED;
      if (paidAmount.gte(invoice.computedAmount)) nextStatus = InvoiceStatus.PAID;
      else if (paidAmount.gt(0)) nextStatus = InvoiceStatus.PARTIAL;
      if (nextStatus !== invoice.status) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: nextStatus },
        });
      }
    }
  }
}
