import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCertificationLevelDto } from './dto/create-certification-level.dto';
import { UpdateCertificationLevelDto } from './dto/update-certification-level.dto';

const LEVEL_SELECT = {
  id: true,
  certificationAuthorityId: true,
  authority: {
    select: { code: true, name: true },
  },
  code: true,
  name: true,
  entryGrade: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CertificationLevelSelect;

@Injectable()
export class CertificationLevelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    certificationAuthorityId?: number;
    sortBy?: string;
    sortDirection?: string;
  }) {
    const { page, limit, search, status, certificationAuthorityId } = params;

    const where: Prisma.CertificationLevelWhereInput = {
      ...(certificationAuthorityId ? { certificationAuthorityId } : {}),
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
              { entryGrade: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CertificationLevelOrderByWithRelationInput[] = [];
    if (params.sortBy === 'authority') {
      orderBy.push({
        authority: { name: params.sortDirection === 'asc' ? 'asc' : 'desc' },
      });
    } else if (params.sortBy === 'code' || params.sortBy === 'name') {
      orderBy.push({
        [params.sortBy]: params.sortDirection === 'asc' ? 'asc' : 'desc',
      });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }
    orderBy.push({ id: 'desc' });

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.certificationLevel.count({ where }),
      this.prisma.certificationLevel.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: LEVEL_SELECT,
      }),
    ]);

    return {
      items: rows.map((row) => this.toView(row)),
      total,
      page,
      limit,
    };
  }

  async findOneById(id: number) {
    const row = await this.prisma.certificationLevel.findUnique({
      where: { id },
      select: LEVEL_SELECT,
    });
    if (!row) {
      throw new NotFoundException(
        `Certification level with id '${id}' not found`,
      );
    }
    return this.toView(row);
  }

  async create(dto: CreateCertificationLevelDto, actorId: number) {
    const authority = await this.prisma.certificationAuthority.findUnique({
      where: { id: dto.certificationAuthorityId },
      select: { id: true },
    });
    if (!authority) {
      throw new BadRequestException(
        'Selected certification authority does not exist',
      );
    }

    await this.assertUnique(dto.certificationAuthorityId, dto.code, dto.name);

    const row = await this.prisma.certificationLevel.create({
      data: {
        certificationAuthorityId: dto.certificationAuthorityId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        entryGrade: dto.entryGrade ?? null,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: LEVEL_SELECT,
    });

    await this.audit.log(
      'certification_level.create',
      actorId,
      'CertificationLevel',
      row.id,
      { newValues: { code: row.code, name: row.name } },
    );

    return this.toView(row);
  }

  async update(id: number, dto: UpdateCertificationLevelDto, actorId: number) {
    const existing = await this.findOneById(id);

    const authorityId =
      dto.certificationAuthorityId ?? existing.certificationAuthorityId;
    if (dto.certificationAuthorityId) {
      const authority = await this.prisma.certificationAuthority.findUnique({
        where: { id: dto.certificationAuthorityId },
        select: { id: true },
      });
      if (!authority) {
        throw new BadRequestException(
          'Selected certification authority does not exist',
        );
      }
    }

    await this.assertUnique(authorityId, dto.code, dto.name, id);

    const row = await this.prisma.certificationLevel.update({
      where: { id },
      data: {
        certificationAuthorityId: dto.certificationAuthorityId,
        code: dto.code?.trim(),
        name: dto.name?.trim(),
        entryGrade: dto.entryGrade,
        description: dto.description,
        isActive: dto.isActive,
        updatedBy: actorId,
      },
      select: LEVEL_SELECT,
    });

    await this.audit.log(
      'certification_level.update',
      actorId,
      'CertificationLevel',
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
    await this.prisma.certificationLevel.delete({ where: { id } });
    await this.audit.log(
      'certification_level.delete',
      actorId,
      'CertificationLevel',
      id,
      {},
    );
  }

  private toView(row: {
    id: number;
    certificationAuthorityId: number;
    authority: { code: string; name: string };
    code: string;
    name: string;
    entryGrade: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      certificationAuthorityId: row.certificationAuthorityId,
      certificationAuthorityCode: row.authority.code,
      certificationAuthorityName: row.authority.name,
      code: row.code,
      name: row.name,
      entryGrade: row.entryGrade,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async assertUnique(
    certificationAuthorityId: number,
    code?: string,
    name?: string,
    excludeId?: number,
  ): Promise<void> {
    if (!code && !name) return;
    const or: Prisma.CertificationLevelWhereInput[] = [];
    if (code) or.push({ code: { equals: code.trim(), mode: 'insensitive' } });
    if (name) or.push({ name: { equals: name.trim(), mode: 'insensitive' } });

    const existing = await this.prisma.certificationLevel.findFirst({
      where: {
        certificationAuthorityId,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
        OR: or,
      },
      select: { id: true, code: true, name: true },
    });
    if (existing) {
      const field = existing.code === code?.trim() ? 'code' : 'name';
      throw new ConflictException(
        `A certification level with this ${field} already exists for this authority`,
      );
    }
  }
}
