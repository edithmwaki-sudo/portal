import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';

const SESSION_SELECT = {
  id: true,
  academicYearId: true,
  code: true,
  name: true,
  startDate: true,
  endDate: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  year: { select: { id: true, code: true, name: true } },
  _count: {
    select: { calendarEvents: true, timetables: true },
  },
} satisfies Prisma.AcademicSessionSelect;

type SessionRecord = {
  id: number;
  academicYearId: number;
  code: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  year: { id: number; code: string; name: string };
  _count: { calendarEvents: number; timetables: number };
};

function toView(row: SessionRecord) {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    yearCode: row.year.code,
    yearName: row.year.name,
    code: row.code,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
    isActive: row.isActive,
    eventCount: row._count.calendarEvents,
    timetableCount: row._count.timetables,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class AcademicSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(params: {
    page: number;
    limit: number;
    academicYearId?: number;
    search?: string;
  }) {
    const { page, limit, academicYearId, search } = params;

    const where: Prisma.AcademicSessionWhereInput = {
      ...(academicYearId ? { academicYearId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.AcademicSessionOrderByWithRelationInput[] = [
      { isActive: 'desc' },
      { startDate: 'asc' },
      { id: 'asc' },
    ];

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.academicSession.count({ where }),
      this.prisma.academicSession.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: SESSION_SELECT,
      }),
    ]);

    return { items: rows.map(toView), total, page, limit };
  }

  async findOneById(id: number) {
    const row = await this.prisma.academicSession.findUnique({
      where: { id },
      select: SESSION_SELECT,
    });
    if (!row) {
      throw new NotFoundException(`Academic session with id '${id}' not found`);
    }
    return toView(row);
  }

  async create(dto: CreateAcademicSessionDto, actorId: number) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
      select: { id: true },
    });
    if (!year) {
      throw new BadRequestException('Selected academic year does not exist');
    }

    const code = dto.code.trim().toUpperCase();
    await this.assertUniqueCode(dto.academicYearId, code);

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.academicSession.create({
        data: {
          academicYearId: dto.academicYearId,
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
        await tx.academicSession.updateMany({
          where: {
            academicYearId: dto.academicYearId,
            isActive: true,
            NOT: { id: created.id },
          },
          data: { isActive: false, updatedBy: actorId },
        });
      }

      return created;
    });

    await this.audit.log(
      'academic_session.create',
      actorId,
      'AcademicSession',
      row.id,
      {
        newValues: {
          code: row.code,
          name: row.name,
          academicYearId: row.academicYearId,
        },
      },
    );

    return this.findOneById(row.id);
  }

  async update(id: number, dto: UpdateAcademicSessionDto, actorId: number) {
    const existing = await this.findOneById(id);

    const code = dto.code?.trim().toUpperCase() ?? existing.code;
    const academicYearId = dto.academicYearId ?? existing.academicYearId;
    if (code !== existing.code || academicYearId !== existing.academicYearId) {
      await this.assertUniqueCode(academicYearId, code, id);
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.academicSession.update({
        where: { id },
        data: {
          academicYearId: dto.academicYearId,
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
        await tx.academicSession.updateMany({
          where: {
            academicYearId,
            isActive: true,
            NOT: { id },
          },
          data: { isActive: false, updatedBy: actorId },
        });
      }

      return updated;
    });

    await this.audit.log(
      'academic_session.update',
      actorId,
      'AcademicSession',
      id,
      {
        oldValues: { code: existing.code, name: existing.name },
        newValues: { code: row.code, name: row.name },
      },
    );

    return this.findOneById(id);
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.findOneById(id);
    await this.prisma.academicSession.delete({ where: { id } });
    await this.audit.log(
      'academic_session.delete',
      actorId,
      'AcademicSession',
      id,
      {},
    );
  }

  private async assertUniqueCode(
    academicYearId: number,
    code: string,
    excludeId?: number,
  ) {
    const existing = await this.prisma.academicSession.findFirst({
      where: {
        academicYearId,
        code: { equals: code, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'A session with this code already exists for this academic year',
      );
    }
  }
}
