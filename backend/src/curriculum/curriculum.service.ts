import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';

const CURRICULUM_SELECT = {
  id: true,
  certificationAuthorityId: true,
  authority: {
    select: { code: true, name: true },
  },
  cycleName: true,
  isActive: true,
  startedAt: true,
  endedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CurriculumSelect;

@Injectable()
export class CurriculumService {
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

    const where: Prisma.CurriculumWhereInput = {
      ...(certificationAuthorityId ? { certificationAuthorityId } : {}),
      ...(status === 'active'
        ? { isActive: true }
        : status === 'inactive'
          ? { isActive: false }
          : {}),
      ...(search
        ? {
            OR: [
              { cycleName: { contains: search, mode: 'insensitive' } },
              { authority: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CurriculumOrderByWithRelationInput[] = [];
    if (params.sortBy === 'authority') {
      orderBy.push({
        authority: { name: params.sortDirection === 'asc' ? 'asc' : 'desc' },
      });
    } else if (params.sortBy === 'cycleName') {
      orderBy.push({ cycleName: params.sortDirection === 'asc' ? 'asc' : 'desc' });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }
    orderBy.push({ id: 'desc' });

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.curriculum.count({ where }),
      this.prisma.curriculum.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: CURRICULUM_SELECT,
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
    const row = await this.prisma.curriculum.findUnique({
      where: { id },
      select: CURRICULUM_SELECT,
    });
    if (!row) {
      throw new NotFoundException(`Curriculum with id '${id}' not found`);
    }
    return this.toView(row);
  }

  async create(dto: CreateCurriculumDto, actorId: number) {
    const authority = await this.prisma.certificationAuthority.findUnique({
      where: { id: dto.certificationAuthorityId },
      select: { id: true },
    });
    if (!authority) {
      throw new BadRequestException('Selected certification authority does not exist');
    }

    await this.assertUnique(dto.cycleName);

    const row = await this.prisma.curriculum.create({
      data: {
        certificationAuthorityId: dto.certificationAuthorityId,
        cycleName: dto.cycleName.trim(),
        isActive: false,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: CURRICULUM_SELECT,
    });

    await this.audit.log(
      'curriculum.create',
      actorId,
      'Curriculum',
      row.id,
      { newValues: { cycleName: row.cycleName } },
    );

    return this.toView(row);
  }

  async update(id: number, dto: UpdateCurriculumDto, actorId: number) {
    const existing = await this.findOneById(id);

    if (dto.certificationAuthorityId) {
      const authority = await this.prisma.certificationAuthority.findUnique({
        where: { id: dto.certificationAuthorityId },
        select: { id: true },
      });
      if (!authority) {
        throw new BadRequestException('Selected certification authority does not exist');
      }
    }

    const cycleName = dto.cycleName ?? existing.cycleName;
    await this.assertUnique(cycleName, id);

    const row = await this.prisma.curriculum.update({
      where: { id },
      data: {
        certificationAuthorityId: dto.certificationAuthorityId,
        cycleName: dto.cycleName?.trim(),
        updatedBy: actorId,
      },
      select: CURRICULUM_SELECT,
    });

    await this.audit.log('curriculum.update', actorId, 'Curriculum', id, {
      oldValues: { cycleName: existing.cycleName },
      newValues: { cycleName: row.cycleName },
    });

    return this.toView(row);
  }

  /**
   * Toggle active state. On activation the startedAt is set to now (the day it
   * is activated); on deactivation endedAt is set to now (the day it is
   * deactivated). All lifecycle dates are generated server-side.
   */
  async toggleActive(id: number, actorId: number) {
    const existing = await this.findOneById(id);

    const becomeActive = !existing.isActive;
    const row = await this.prisma.curriculum.update({
      where: { id },
      data: {
        isActive: becomeActive,
        ...(becomeActive
          ? { startedAt: new Date(), endedAt: null }
          : { endedAt: new Date() }),
        updatedBy: actorId,
      },
      select: CURRICULUM_SELECT,
    });

    await this.audit.log(
      'curriculum.toggle_active',
      actorId,
      'Curriculum',
      id,
      {
        oldValues: { isActive: existing.isActive },
        newValues: { isActive: row.isActive, startedAt: row.startedAt, endedAt: row.endedAt },
      },
    );

    return this.toView(row);
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.findOneById(id);
    await this.prisma.curriculum.delete({ where: { id } });
    await this.audit.log('curriculum.delete', actorId, 'Curriculum', id, {});
  }

  private toView(row: {
    id: number;
    certificationAuthorityId: number;
    authority: { code: string; name: string };
    cycleName: string;
    isActive: boolean;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      certificationAuthorityId: row.certificationAuthorityId,
      certificationAuthorityCode: row.authority.code,
      certificationAuthorityName: row.authority.name,
      cycleName: row.cycleName,
      isActive: row.isActive,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async assertUnique(cycleName: string, excludeId?: number): Promise<void> {
    const existing = await this.prisma.curriculum.findFirst({
      where: {
        cycleName: { equals: cycleName.trim(), mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A curriculum cycle with this name already exists');
    }
  }
}