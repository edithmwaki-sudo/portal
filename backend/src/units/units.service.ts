import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

const UNIT_SELECT = {
  id: true,
  courseId: true,
  curriculumId: true,
  code: true,
  name: true,
  description: true,
  modulesTaught: true,
  taughtHours: true,
  creditFactor: true,
  isActive: true,
  course: { select: { id: true, code: true, initials: true, name: true } },
  curriculum: { select: { id: true, cycleName: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UnitSelect;

type UnitRecord = {
  id: number;
  courseId: number;
  curriculumId: number;
  code: string;
  name: string;
  description: string | null;
  modulesTaught: number | null;
  taughtHours: number | null;
  creditFactor: Prisma.Decimal | null;
  isActive: boolean;
  course: { id: number; code: string; initials: string; name: string };
  curriculum: { id: number; cycleName: string };
  createdAt: Date;
  updatedAt: Date;
};

function toView(row: UnitRecord) {
  return {
    id: row.id,
    courseId: row.courseId,
    curriculumId: row.curriculumId,
    code: row.code,
    name: row.name,
    description: row.description,
    modulesTaught: row.modulesTaught,
    taughtHours: row.taughtHours,
    creditFactor: row.creditFactor ? Number(row.creditFactor) : null,
    isActive: row.isActive,
    course: row.course,
    curriculum: row.curriculum,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class UnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Admin (unit.view) sees all units. HOD scoping (unit.hodview) is applied by
   * the controller via `departmentScopeId` — never derived from query params.
   * When `courseId` is provided the result is restricted to that course (and
   * optionally `curriculumId`).
   */
  async findAll(
    params: {
      page: number;
      limit: number;
      courseId?: number;
      curriculumId?: number;
      search?: string;
      status?: string;
      sortBy?: string;
      sortDirection?: string;
    },
    departmentScopeId?: number | null,
  ) {
    const { page, limit, courseId, curriculumId, search, status } = params;

    const where: Prisma.UnitWhereInput = {
      ...(courseId ? { courseId } : {}),
      ...(curriculumId ? { curriculumId } : {}),
      ...(departmentScopeId !== undefined
        ? { course: { departmentId: departmentScopeId } }
        : {}),
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
            ],
          }
        : {}),
    };

    const orderBy: Prisma.UnitOrderByWithRelationInput[] = [];
    if (params.sortBy === 'code' || params.sortBy === 'name') {
      orderBy.push({
        [params.sortBy]: params.sortDirection === 'asc' ? 'asc' : 'desc',
      });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }
    orderBy.push({ id: 'desc' });

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.unit.count({ where }),
      this.prisma.unit.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: UNIT_SELECT,
      }),
    ]);

    return {
      items: rows.map(toView),
      total,
      page,
      limit,
    };
  }

  async findOneById(id: number) {
    const row = await this.prisma.unit.findUnique({
      where: { id },
      select: UNIT_SELECT,
    });
    if (!row) {
      throw new NotFoundException(`Unit with id '${id}' not found`);
    }
    return toView(row);
  }

  async create(dto: CreateUnitDto, actorId: number) {
    await this.assertCourseAndCurriculum(dto.courseId, dto.curriculumId);
    await this.assertUniqueCode(
      dto.courseId,
      dto.curriculumId,
      dto.code.trim(),
    );

    const row = await this.prisma.unit.create({
      data: {
        courseId: dto.courseId,
        curriculumId: dto.curriculumId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description ?? null,
        modulesTaught: dto.modulesTaught ?? null,
        taughtHours: dto.taughtHours ?? null,
        creditFactor: dto.creditFactor ?? null,
        isActive: dto.isActive ?? true,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: UNIT_SELECT,
    });

    await this.audit.log('unit.create', actorId, 'Unit', row.id, {
      newValues: {
        code: row.code,
        name: row.name,
        courseId: row.courseId,
        curriculumId: row.curriculumId,
      },
    });

    return toView(row);
  }

  async update(id: number, dto: UpdateUnitDto, actorId: number) {
    const existing = await this.findOneById(id);

    const courseId = dto.courseId ?? existing.courseId;
    const curriculumId = dto.curriculumId ?? existing.curriculumId;
    const code = dto.code?.trim() ?? existing.code;

    if (
      courseId !== existing.courseId ||
      curriculumId !== existing.curriculumId
    ) {
      await this.assertCourseAndCurriculum(courseId, curriculumId);
    }
    if (
      code !== existing.code ||
      courseId !== existing.courseId ||
      curriculumId !== existing.curriculumId
    ) {
      await this.assertUniqueCode(courseId, curriculumId, code, id);
    }

    const row = await this.prisma.unit.update({
      where: { id },
      data: {
        courseId: dto.courseId,
        curriculumId: dto.curriculumId,
        code: dto.code?.trim(),
        name: dto.name?.trim(),
        description: dto.description,
        modulesTaught: dto.modulesTaught,
        taughtHours: dto.taughtHours,
        creditFactor: dto.creditFactor,
        isActive: dto.isActive,
        updatedBy: actorId,
      },
      select: UNIT_SELECT,
    });

    await this.audit.log('unit.update', actorId, 'Unit', id, {
      oldValues: { code: existing.code, name: existing.name },
      newValues: { code: row.code, name: row.name },
    });

    return toView(row);
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.findOneById(id);
    await this.prisma.unit.delete({ where: { id } });
    await this.audit.log('unit.delete', actorId, 'Unit', id, {});
  }

  /** The department id the user belongs to via their staff profile (HOD). */
  async resolveHodDepartmentId(userId: number): Promise<number | null> {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { departmentId: true },
    });
    return staff?.departmentId ?? null;
  }

  /** The owning department of a course (null when the course is gone). */
  async getCourseDepartmentId(courseId: number): Promise<number | null> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: { departmentId: true },
    });
    return course?.departmentId ?? null;
  }

  /* ------------------------- Guards ------------------------- */

  private async assertCourseAndCurriculum(
    courseId: number,
    curriculumId: number,
  ): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: { id: true },
    });
    if (!course) {
      throw new BadRequestException('Selected course does not exist');
    }

    const mapping = await this.prisma.courseCurriculum.findFirst({
      where: { courseId, curriculumId, isActive: true },
      select: { id: true },
    });
    if (!mapping) {
      throw new BadRequestException(
        'Selected curriculum is not assigned to this course',
      );
    }
  }

  private async assertUniqueCode(
    courseId: number,
    curriculumId: number,
    code: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.prisma.unit.findFirst({
      where: {
        courseId,
        curriculumId,
        code: { equals: code, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'A unit with this code already exists for this course and curriculum',
      );
    }
  }
}
