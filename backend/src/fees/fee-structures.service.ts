import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';

const FEE_STRUCTURE_LIST_SELECT = {
  id: true,
  feeName: true,
  description: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.FeeStructureSelect;

type FeeStructureListRow = {
  id: number;
  feeName: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  status: FeeStatus;
  createdAt: Date;
  updatedAt: Date;
  _count: { items: number };
};

type FeeItemRow = {
  id: number;
  itemName: string;
  amount: Prisma.Decimal;
  displayOrder: number;
};

function toListView(row: FeeStructureListRow) {
  return {
    id: row.id,
    feeName: row.feeName,
    description: row.description,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    itemsCount: row._count.items,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toItemView(item: FeeItemRow) {
  return {
    id: item.id,
    itemName: item.itemName,
    amount: Number(item.amount),
    displayOrder: item.displayOrder,
  };
}

@Injectable()
export class FeeStructuresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 25, search?: string, status?: string) {
    const where: Prisma.FeeStructureWhereInput = {
      deletedAt: null,
      ...(status === 'active'
        ? { status: FeeStatus.ACTIVE }
        : status === 'inactive'
          ? { status: FeeStatus.INACTIVE }
          : {}),
      ...(search
        ? {
            OR: [
              { feeName: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.feeStructure.count({ where }),
      this.prisma.feeStructure.findMany({
        where,
        orderBy: { feeName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: FEE_STRUCTURE_LIST_SELECT,
      }),
    ]);

    return { items: rows.map(toListView), total, page, limit };
  }

  async findOneById(id: number) {
    const row = await this.prisma.feeStructure.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            itemName: true,
            amount: true,
            displayOrder: true,
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException(`Fee structure with id '${id}' not found`);
    }

    const view = toListView({
      ...row,
      _count: { items: row.items.length },
    });
    return { ...view, items: row.items.map(toItemView) };
  }

  /** Active structures for the assignment picker (search-driven async select). */
  async listOptions(search?: string, limit = 10) {
    const term = search?.trim();
    if (!term || term.length < 2) {
      return [];
    }

    const rows = await this.prisma.feeStructure.findMany({
      where: {
        deletedAt: null,
        status: FeeStatus.ACTIVE,
        feeName: { contains: term, mode: 'insensitive' },
      },
      orderBy: { feeName: 'asc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: {
        id: true,
        feeName: true,
        _count: { select: { items: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      feeName: row.feeName,
      label: `${row.feeName} (${row._count.items} item${
        row._count.items === 1 ? '' : 's'
      })`,
    }));
  }

  async create(dto: CreateFeeStructureDto, actorId: number) {
    await this.assertUniqueFeeName(dto.feeName);
    const items = this.normalizeItems(dto.items);

    const row = await this.prisma.feeStructure.create({
      data: {
        feeName: dto.feeName.trim(),
        description: dto.description ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status ?? FeeStatus.ACTIVE,
        createdBy: actorId,
        updatedBy: actorId,
        items: {
          create: items.map((item, index) => ({
            itemName: item.itemName,
            amount: item.amount,
            displayOrder: item.displayOrder ?? index,
          })),
        },
      },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            itemName: true,
            amount: true,
            displayOrder: true,
          },
        },
      },
    });

    await this.audit.log(
      'fee_structure.create',
      actorId,
      'FeeStructure',
      row.id,
      {
        newValues: { feeName: row.feeName },
      },
    );

    return {
      ...toListView({ ...row, _count: { items: row.items.length } }),
      items: row.items.map(toItemView),
    };
  }

  async update(id: number, dto: UpdateFeeStructureDto, actorId: number) {
    const existing = await this.findOneById(id);
    if (dto.feeName !== undefined) {
      await this.assertUniqueFeeName(dto.feeName, id);
    }

    const items = dto.items ? this.normalizeItems(dto.items) : null;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.feeStructure.update({
        where: { id },
        data: {
          feeName: dto.feeName?.trim(),
          description: dto.description,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate:
            dto.endDate === null
              ? null
              : dto.endDate
                ? new Date(dto.endDate)
                : undefined,
          status: dto.status,
          updatedBy: actorId,
        },
      });

      if (items) {
        await tx.feeItem.deleteMany({ where: { feeStructureId: id } });
        await tx.feeItem.createMany({
          data: items.map((item, index) => ({
            feeStructureId: id,
            itemName: item.itemName,
            amount: item.amount,
            displayOrder: item.displayOrder ?? index,
          })),
        });
      }

      return tx.feeStructure.findFirstOrThrow({
        where: { id },
        include: {
          items: {
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              itemName: true,
              amount: true,
              displayOrder: true,
            },
          },
        },
      });
    });

    await this.audit.log('fee_structure.update', actorId, 'FeeStructure', id, {
      oldValues: { feeName: existing.feeName },
      newValues: { feeName: row.feeName },
    });

    return {
      ...toListView({ ...row, _count: { items: row.items.length } }),
      items: row.items.map(toItemView),
    };
  }

  /** Soft delete only. Prohibited while active assignments reference the structure. */
  async remove(id: number, actorId: number): Promise<void> {
    await this.findOneById(id);

    const activeAssignments = await this.prisma.courseFeeAssignment.findFirst({
      where: { feeStructureId: id, deletedAt: null, status: FeeStatus.ACTIVE },
      select: { id: true },
    });
    if (activeAssignments) {
      throw new ConflictException(
        'Cannot delete a fee structure that has active course fee assignments. ' +
          'Deactivate it instead — historical records must remain intact.',
      );
    }

    await this.prisma.feeStructure.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
    });
    await this.audit.log(
      'fee_structure.delete',
      actorId,
      'FeeStructure',
      id,
      {},
    );
  }

  /** Validates item rules and returns typed item rows ready for persistence. */
  private normalizeItems(
    items: {
      itemName?: string;
      amount?: number;
      displayOrder?: number;
    }[],
  ): { itemName: string; amount: number; displayOrder: number | undefined }[] {
    const seen = new Set<string>();
    return items.map((item) => {
      if (!item.itemName || item.amount === undefined) {
        throw new BadRequestException(
          'Each fee item must provide an itemName and an amount',
        );
      }
      const key = item.itemName.trim().toLowerCase();
      if (seen.has(key)) {
        throw new BadRequestException(
          `Item name '${item.itemName}' is duplicated within the fee structure`,
        );
      }
      seen.add(key);
      return {
        itemName: item.itemName.trim(),
        amount: item.amount,
        displayOrder: item.displayOrder,
      };
    });
  }

  private async assertUniqueFeeName(feeName: string, excludeId?: number) {
    const existing = await this.prisma.feeStructure.findFirst({
      where: {
        deletedAt: null,
        feeName: { equals: feeName.trim(), mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `A fee structure named '${feeName.trim()}' already exists`,
      );
    }
  }
}
