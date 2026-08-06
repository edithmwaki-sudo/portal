import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCertificationAuthorityDto } from './dto/create-certification-authority.dto';
import { UpdateCertificationAuthorityDto } from './dto/update-certification-authority.dto';

const AUTHORITY_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { levels: true } },
} satisfies Prisma.CertificationAuthoritySelect;

export type AuthorityOrderField =
  | 'code'
  | 'name'
  | 'levelsCount'
  | 'createdAt'
  | 'updatedAt';

@Injectable()
export class CertificationAuthoritiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortDirection?: string;
  }) {
    const { page, limit, search, status } = params;
    const where: Prisma.CertificationAuthorityWhereInput = {
      ...(status === 'active'
        ? { isActive: true }
        : status === 'inactive'
          ? { isActive: false }
          : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderField = this.resolveOrderField(params.sortBy, 'createdAt');
    const orderBy = this.buildOrder(orderField, params.sortDirection);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.certificationAuthority.count({ where }),
      this.prisma.certificationAuthority.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: AUTHORITY_SELECT,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        isActive: row.isActive,
        levelsCount: row._count.levels,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  /** Active authorities for lookup/async-select (legacy lookup endpoint). */
  async listOptions(search?: string, limit = 10) {
    const term = search?.trim();
    if (!term || term.length < 2) {
      return [];
    }

    const rows = await this.prisma.certificationAuthority.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { contains: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: { id: true, code: true, name: true },
    });

    return rows.map((row) => ({
      id: row.id,
      label: `${row.code} ${row.name}`.trim(),
    }));
  }

  async findOneById(id: number) {
    const row = await this.prisma.certificationAuthority.findUnique({
      where: { id },
      select: AUTHORITY_SELECT,
    });
    if (!row) {
      throw new NotFoundException(
        `Certification authority with id '${id}' not found`,
      );
    }

    const levels = await this.prisma.certificationLevel.findMany({
      where: { certificationAuthorityId: id },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        entryGrade: true,
        description: true,
        isActive: true,
      },
    });

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      levelsCount: row._count.levels,
      levels,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(dto: CreateCertificationAuthorityDto, actorId: number) {
    await this.assertUnique(dto.code, dto.name);

    const row = await this.prisma.certificationAuthority.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: AUTHORITY_SELECT,
    });

    await this.audit.log(
      'certification_authority.create',
      actorId,
      'CertificationAuthority',
      row.id,
      { newValues: { code: row.code, name: row.name } },
    );

    return this.toView(row);
  }

  async update(id: number, dto: UpdateCertificationAuthorityDto, actorId: number) {
    const existing = await this.findOneById(id);
    await this.assertUnique(dto.code, dto.name, id);

    const row = await this.prisma.certificationAuthority.update({
      where: { id },
      data: {
        code: dto.code?.trim(),
        name: dto.name?.trim(),
        description: dto.description,
        isActive: dto.isActive,
        updatedBy: actorId,
      },
      select: AUTHORITY_SELECT,
    });

    await this.audit.log(
      'certification_authority.update',
      actorId,
      'CertificationAuthority',
      id,
      {
        oldValues: { code: existing.code, name: existing.name },
        newValues: { code: row.code, name: row.name },
      },
    );

    return this.toView(row);
  }

  async remove(id: number, actorId: number): Promise<void> {
    const existing = await this.findOneById(id);
    if (existing.levelsCount > 0) {
      throw new ConflictException(
        'Remove certification levels from this authority before deleting it.',
      );
    }

    await this.prisma.certificationAuthority.delete({ where: { id } });
    await this.audit.log(
      'certification_authority.delete',
      actorId,
      'CertificationAuthority',
      id,
      {},
    );
  }

  private toView(row: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: { levels: number };
  }) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      levelsCount: row._count.levels,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private resolveOrderField(
    value: string | undefined,
    fallback: AuthorityOrderField,
  ): AuthorityOrderField {
    const fields: AuthorityOrderField[] = [
      'code',
      'name',
      'levelsCount',
      'createdAt',
      'updatedAt',
    ];
    return value && fields.includes(value as AuthorityOrderField)
      ? (value as AuthorityOrderField)
      : fallback;
  }

  private buildOrder(
    field: AuthorityOrderField,
    sortDirection?: string,
  ): Prisma.CertificationAuthorityOrderByWithRelationInput {
    const direction = sortDirection === 'asc' ? 'asc' : 'desc';
    switch (field) {
      case 'code':
        return { code: direction };
      case 'name':
        return { name: direction };
      case 'levelsCount':
        return { levels: { _count: direction } };
      case 'updatedAt':
        return { updatedAt: direction };
      default:
        return { createdAt: direction };
    }
  }

  private async assertUnique(
    code?: string,
    name?: string,
    excludeId?: number,
  ): Promise<void> {
    if (!code && !name) return;
    const or: Prisma.CertificationAuthorityWhereInput[] = [];
    if (code) or.push({ code: { equals: code.trim(), mode: 'insensitive' } });
    if (name) or.push({ name: { equals: name.trim(), mode: 'insensitive' } });

    const existing = await this.prisma.certificationAuthority.findFirst({
      where: {
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
        OR: or,
      },
      select: { id: true, code: true, name: true },
    });
    if (existing) {
      const field = existing.code === code?.trim() ? 'code' : 'name';
      throw new ConflictException(
        `A certification authority with this ${field} already exists`,
      );
    }
  }
}
