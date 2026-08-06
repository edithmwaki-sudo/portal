import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

const DEFAULT_SESSIONS_PER_YEAR = 3;

const YEAR_SELECT = {
  id: true,
  code: true,
  name: true,
  startDate: true,
  endDate: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { sessions: true } },
} satisfies Prisma.AcademicYearSelect;

type YearRecord = {
  id: number;
  code: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { sessions: number };
};

function toView(row: YearRecord) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
    isActive: row.isActive,
    sessionCount: row._count.sessions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class AcademicYearsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
  }) {
    const { page, limit, search } = params;

    const where: Prisma.AcademicYearWhereInput = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const orderBy: Prisma.AcademicYearOrderByWithRelationInput[] = [
      { isActive: 'desc' },
      { startDate: 'desc' },
      { id: 'desc' },
    ];

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.academicYear.count({ where }),
      this.prisma.academicYear.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: YEAR_SELECT,
      }),
    ]);

    return { items: rows.map(toView), total, page, limit };
  }

  async findOneById(id: number) {
    const row = await this.prisma.academicYear.findUnique({
      where: { id },
      select: YEAR_SELECT,
    });
    if (!row) {
      throw new NotFoundException(`Academic year with id '${id}' not found`);
    }
    return toView(row);
  }

  async create(dto: CreateAcademicYearDto, actorId: number) {
    const code = dto.code.trim().toUpperCase();
    await this.assertUniqueCode(code);

    const sessionsPerYear = dto.sessionsPerYear ?? DEFAULT_SESSIONS_PER_YEAR;

    const year = await this.prisma.$transaction(async (tx) => {
      const created = await tx.academicYear.create({
        data: {
          code,
          name: dto.name.trim(),
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          description: dto.description ?? null,
          isActive: dto.isActive ?? false,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      if (dto.isActive) {
        await tx.academicYear.updateMany({
          where: { isActive: true, NOT: { id: created.id } },
          data: { isActive: false, updatedBy: actorId },
        });
      }

      await this.createDefaultSessions(
        tx,
        created.id,
        code,
        created,
        sessionsPerYear,
        actorId,
      );

      return created;
    });

    await this.audit.log(
      'academic_year.create',
      actorId,
      'AcademicYear',
      year.id,
      {
        newValues: { code: year.code, name: year.name },
      },
    );

    return this.findOneById(year.id);
  }

  async update(id: number, dto: UpdateAcademicYearDto, actorId: number) {
    const existing = await this.findOneById(id);

    const code = dto.code?.trim().toUpperCase() ?? existing.code;
    if (code !== existing.code) {
      await this.assertUniqueCode(code, id);
    }

    const year = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.academicYear.update({
        where: { id },
        data: {
          code: dto.code?.trim().toUpperCase(),
          name: dto.name?.trim(),
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          description: dto.description,
          isActive: dto.isActive,
          updatedBy: actorId,
        },
      });

      if (dto.isActive) {
        await tx.academicYear.updateMany({
          where: { isActive: true, NOT: { id } },
          data: { isActive: false, updatedBy: actorId },
        });
      }

      return updated;
    });

    await this.audit.log('academic_year.update', actorId, 'AcademicYear', id, {
      oldValues: { code: existing.code, name: existing.name },
      newValues: { code: year.code, name: year.name },
    });

    return this.findOneById(id);
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.findOneById(id);
    await this.prisma.academicYear.delete({ where: { id } });
    await this.audit.log(
      'academic_year.delete',
      actorId,
      'AcademicYear',
      id,
      {},
    );
  }

  /** Split a year's date range into `count` sequential session ranges. */
  private buildSessionDates(
    start: Date | null,
    end: Date | null,
    count: number,
  ): { startDate?: Date; endDate?: Date }[] {
    if (!start || !end) {
      return Array.from({ length: count }, () => ({}));
    }
    const totalDays = Math.max(
      1,
      Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1,
    );
    const chunk = Math.floor(totalDays / count);
    return Array.from({ length: count }, (_, index) => {
      const s = new Date(start);
      s.setDate(s.getDate() + index * chunk);
      const e = new Date(s);
      e.setDate(e.getDate() + (chunk - 1));
      return { startDate: s, endDate: e };
    });
  }

  private async createDefaultSessions(
    tx: Prisma.TransactionClient,
    yearId: number,
    yearCode: string,
    year: { startDate: Date | null; endDate: Date | null },
    count: number,
    actorId: number,
  ) {
    if (count < 1) return;
    const ranges = this.buildSessionDates(year.startDate, year.endDate, count);
    await tx.academicSession.createMany({
      data: ranges.map((range, index) => {
        const label = index + 1;
        return {
          academicYearId: yearId,
          code: `${yearCode}-S${label}`,
          name: `Session ${label}`,
          startDate: range.startDate,
          endDate: range.endDate,
          isActive: index === 0,
          createdBy: actorId,
          updatedBy: actorId,
        };
      }),
      skipDuplicates: true,
    });
  }

  private async assertUniqueCode(code: string, excludeId?: number) {
    const existing = await this.prisma.academicYear.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'An academic year with this code already exists',
      );
    }
  }
}
