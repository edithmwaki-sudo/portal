import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCertificationGradeDto } from './dto/create-certification-grade.dto';
import { UpdateCertificationGradeDto } from './dto/update-certification-grade.dto';

const GRADE_SELECT = {
  id: true,
  certificationAuthorityId: true,
  grade: true,
  gradeStart: true,
  gradeEnd: true,
  remark: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CertificationAuthorityGradeSelect;

@Injectable()
export class CertificationGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAllByAuthority(
    certificationAuthorityId: number,
    params: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
      sortBy?: string;
      sortDirection?: string;
    },
  ) {
    await this.assertAuthorityExists(certificationAuthorityId);

    const { page, limit, search, status } = params;

    const where: Prisma.CertificationAuthorityGradeWhereInput = {
      certificationAuthorityId,
      ...(status === 'active'
        ? { isActive: true }
        : status === 'inactive'
          ? { isActive: false }
          : {}),
      ...(search
        ? {
            OR: [
              { grade: { contains: search, mode: 'insensitive' } },
              { remark: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CertificationAuthorityGradeOrderByWithRelationInput[] =
      [];
    if (params.sortBy === 'grade' || params.sortBy === 'gradeStart') {
      orderBy.push({
        [params.sortBy]: params.sortDirection === 'asc' ? 'asc' : 'desc',
      });
    } else {
      orderBy.push({ gradeStart: 'asc' });
    }
    orderBy.push({ id: 'desc' });

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.certificationAuthorityGrade.count({ where }),
      this.prisma.certificationAuthorityGrade.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: GRADE_SELECT,
      }),
    ]);

    return {
      items: rows.map((row) => this.toView(row)),
      total,
      page,
      limit,
    };
  }

  async findOneById(certificationAuthorityId: number, id: number) {
    const row = await this.prisma.certificationAuthorityGrade.findFirst({
      where: { id, certificationAuthorityId },
      select: GRADE_SELECT,
    });
    if (!row) {
      throw new NotFoundException(
        `Certification grade with id '${id}' not found`,
      );
    }
    return this.toView(row);
  }

  async create(
    certificationAuthorityId: number,
    dto: CreateCertificationGradeDto,
    actorId: number,
  ) {
    await this.assertAuthorityExists(certificationAuthorityId);
    this.assertRange(dto.gradeStart, dto.gradeEnd);
    await this.assertNoOverlap(certificationAuthorityId, dto.gradeStart, dto.gradeEnd);
    await this.assertGradeUnique(certificationAuthorityId, dto.grade);

    const row = await this.prisma.certificationAuthorityGrade.create({
      data: {
        certificationAuthorityId,
        grade: dto.grade.trim(),
        gradeStart: dto.gradeStart,
        gradeEnd: dto.gradeEnd,
        remark: dto.remark ?? null,
        isActive: dto.isActive ?? true,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: GRADE_SELECT,
    });

    await this.audit.log(
      'certification_grade.create',
      actorId,
      'CertificationAuthorityGrade',
      row.id,
      { newValues: { grade: row.grade } },
    );

    return this.toView(row);
  }

  async update(
    certificationAuthorityId: number,
    id: number,
    dto: UpdateCertificationGradeDto,
    actorId: number,
  ) {
    const existing = await this.findOneById(certificationAuthorityId, id);

    const gradeStart = dto.gradeStart ?? existing.gradeStart;
    const gradeEnd = dto.gradeEnd ?? existing.gradeEnd;
    this.assertRange(gradeStart, gradeEnd);
    await this.assertNoOverlap(
      certificationAuthorityId,
      gradeStart,
      gradeEnd,
      id,
    );
    if (dto.grade) {
      await this.assertGradeUnique(certificationAuthorityId, dto.grade, id);
    }

    const row = await this.prisma.certificationAuthorityGrade.update({
      where: { id },
      data: {
        grade: dto.grade?.trim(),
        gradeStart: dto.gradeStart,
        gradeEnd: dto.gradeEnd,
        remark: dto.remark,
        isActive: dto.isActive,
        updatedBy: actorId,
      },
      select: GRADE_SELECT,
    });

    await this.audit.log(
      'certification_grade.update',
      actorId,
      'CertificationAuthorityGrade',
      id,
      {
        oldValues: { grade: existing.grade },
        newValues: { grade: row.grade },
      },
    );

    return this.toView(row);
  }

  async remove(
    certificationAuthorityId: number,
    id: number,
    actorId: number,
  ): Promise<void> {
    await this.findOneById(certificationAuthorityId, id);
    await this.prisma.certificationAuthorityGrade.delete({ where: { id } });
    await this.audit.log(
      'certification_grade.delete',
      actorId,
      'CertificationAuthorityGrade',
      id,
      {},
    );
  }

  private toView(row: {
    id: number;
    certificationAuthorityId: number;
    grade: string;
    gradeStart: Prisma.Decimal | number;
    gradeEnd: Prisma.Decimal | number;
    remark: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      certificationAuthorityId: row.certificationAuthorityId,
      grade: row.grade,
      gradeStart: Number(row.gradeStart),
      gradeEnd: Number(row.gradeEnd),
      remark: row.remark,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private assertRange(start: number, end: number): void {
    if (end < start) {
      throw new BadRequestException(
        'grade_end must be greater than or equal to grade_start',
      );
    }
  }

  private async assertGradeUnique(
    certificationAuthorityId: number,
    grade: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.prisma.certificationAuthorityGrade.findFirst({
      where: {
        certificationAuthorityId,
        grade: { equals: grade.trim(), mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'A grade with this label already exists for this authority',
      );
    }
  }

  private async assertNoOverlap(
    certificationAuthorityId: number,
    gradeStart: number,
    gradeEnd: number,
    excludeId?: number,
  ): Promise<void> {
    const overlapping = await this.prisma.certificationAuthorityGrade.findFirst({
      where: {
        certificationAuthorityId,
        gradeEnd: { gte: gradeStart },
        gradeStart: { lte: gradeEnd },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true, grade: true },
    });
    if (overlapping) {
      throw new ConflictException(
        `This grade range overlaps with the existing grade '${overlapping.grade}'`,
      );
    }
  }

  private async assertAuthorityExists(certificationAuthorityId: number) {
    const authority = await this.prisma.certificationAuthority.findUnique({
      where: { id: certificationAuthorityId },
      select: { id: true },
    });
    if (!authority) {
      throw new NotFoundException(
        `Certification authority with id '${certificationAuthorityId}' not found`,
      );
    }
  }
}
