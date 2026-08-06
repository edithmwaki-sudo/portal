import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

const DEPARTMENT_SELECT = {
  id: true,
  code: true,
  name: true,
  headOfDepartmentId: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  headOfDepartment: {
    select: {
      id: true,
      employeeNumber: true,
      jobTitle: true,
      user: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.DepartmentSelect;

type DepartmentRecord = {
  id: number;
  code: string;
  name: string;
  headOfDepartmentId: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  headOfDepartment: {
    id: number;
    employeeNumber: string | null;
    jobTitle: string | null;
    user: { id: number; name: string };
  } | null;
};

function toView(row: DepartmentRecord) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    headOfDepartmentId: row.headOfDepartmentId,
    headOfDepartmentName: row.headOfDepartment?.user.name ?? null,
    headOfDepartmentEmployeeNumber:
      row.headOfDepartment?.employeeNumber ?? null,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 25, search?: string) {
    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: DEPARTMENT_SELECT,
      }),
    ]);

    return { items: rows.map(toView), total, page, limit };
  }

  async findOneById(id: number) {
    const row = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      select: DEPARTMENT_SELECT,
    });
    if (!row) {
      throw new NotFoundException(`Department with id '${id}' not found`);
    }
    return toView(row);
  }

  /** Active staff options for the "Head of Department" picker (server search). */
  async listHeadOptions(search?: string, limit = 10) {
    const term = search?.trim();
    if (!term || term.length < 2) {
      return [];
    }

    const staff = await this.prisma.staffProfile.findMany({
      where: {
        deletedAt: null,
        user: { status: 'ACTIVE' },
        OR: [
          { employeeNumber: { contains: term, mode: 'insensitive' } },
          { user: { name: { contains: term, mode: 'insensitive' } } },
        ],
      },
      orderBy: { user: { name: 'asc' } },
      take: Math.min(Math.max(limit, 1), 50),
      select: {
        id: true,
        employeeNumber: true,
        jobTitle: true,
        user: { select: { id: true, name: true } },
      },
    });

    return staff.map((member) => ({
      id: member.id,
      employeeNumber: member.employeeNumber,
      name: member.user.name,
      jobTitle: member.jobTitle,
      label: member.employeeNumber
        ? `${member.employeeNumber} - ${member.user.name}`
        : member.user.name,
    }));
  }

  async create(dto: CreateDepartmentDto, actorId: number) {
    await this.assertUnique(dto.code, dto.name);
    if (dto.headOfDepartmentId !== undefined) {
      await this.assertStaffExists(dto.headOfDepartmentId);
    }

    const row = await this.prisma.department.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        headOfDepartmentId: dto.headOfDepartmentId ?? null,
        description: dto.description ?? null,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: DEPARTMENT_SELECT,
    });

    await this.audit.log('department.create', actorId, 'Department', row.id, {
      newValues: { code: row.code, name: row.name },
    });

    return toView(row);
  }

  async update(id: number, dto: UpdateDepartmentDto, actorId: number) {
    const existing = await this.findOneById(id);
    await this.assertUnique(dto.code, dto.name, id);
    if (dto.headOfDepartmentId !== undefined) {
      await this.assertStaffExists(dto.headOfDepartmentId);
    }

    const row = await this.prisma.department.update({
      where: { id },
      data: {
        code: dto.code?.trim(),
        name: dto.name?.trim(),
        headOfDepartmentId: dto.headOfDepartmentId,
        description: dto.description,
        updatedBy: actorId,
      },
      select: DEPARTMENT_SELECT,
    });

    await this.audit.log('department.update', actorId, 'Department', id, {
      oldValues: { code: existing.code, name: existing.name },
      newValues: { code: row.code, name: row.name },
    });

    return toView(row);
  }

  /** Soft delete (legacy behavior) — departments keep history/audit integrity. */
  async remove(id: number, actorId: number): Promise<void> {
    await this.findOneById(id);
    await this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
    });
    await this.audit.log('department.delete', actorId, 'Department', id, {});
  }

  private async assertUnique(
    code?: string,
    name?: string,
    excludeId?: number,
  ): Promise<void> {
    if (!code && !name) return;
    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      OR: [],
    };
    const or: Prisma.DepartmentWhereInput[] = [];
    if (code) or.push({ code: { equals: code.trim(), mode: 'insensitive' } });
    if (name) or.push({ name: { equals: name.trim(), mode: 'insensitive' } });
    if (or.length === 0) return;
    where.OR = or;

    const existing = await this.prisma.department.findFirst({
      where,
      select: { id: true, code: true, name: true },
    });
    if (existing) {
      const field = existing.code === code?.trim() ? 'code' : 'name';
      throw new ConflictException(
        `A department with this ${field} already exists`,
      );
    }
  }

  private async assertStaffExists(staffProfileId: number): Promise<void> {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: staffProfileId, deletedAt: null },
      select: { id: true },
    });
    if (!staff) {
      throw new BadRequestException(
        `Head of department staff profile '${staffProfileId}' not found`,
      );
    }
  }
}
