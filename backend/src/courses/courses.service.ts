import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

const COURSE_SELECT = {
  id: true,
  code: true,
  initials: true,
  name: true,
  durationMonths: true,
  description: true,
  isActive: true,
  certificationAuthorityId: true,
  authority: { select: { code: true, name: true } },
  certificationLevelId: true,
  level: { select: { code: true, name: true } },
  departmentId: true,
  department: { select: { name: true } },
  courseCurricula: {
    select: {
      id: true,
      isActive: true,
      curriculum: { select: { id: true, cycleName: true } },
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CourseSelect;

const COURSE_LIST_SELECT = {
  id: true,
  code: true,
  initials: true,
  name: true,
  durationMonths: true,
  description: true,
  isActive: true,
  certificationAuthorityId: true,
  authority: { select: { code: true, name: true } },
  certificationLevelId: true,
  level: { select: { code: true, name: true } },
  departmentId: true,
  department: { select: { name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CourseSelect;

type CourseRecord = {
  id: number;
  code: string;
  initials: string;
  name: string;
  durationMonths: number | null;
  description: string | null;
  isActive: boolean;
  certificationAuthorityId: number | null;
  certificationLevelId: number | null;
  departmentId: number | null;
  authority: { code: string; name: string } | null;
  level: { code: string; name: string } | null;
  department: { name: string } | null;
  courseCurricula: {
    id: number;
    isActive: boolean;
    curriculum: { id: number; cycleName: string };
  }[];
  createdAt: Date;
  updatedAt: Date;
};

function toView(row: CourseRecord) {
  return {
    id: row.id,
    code: row.code,
    initials: row.initials,
    name: row.name,
    durationMonths: row.durationMonths,
    description: row.description,
    isActive: row.isActive,
    certificationAuthorityId: row.certificationAuthorityId,
    certificationAuthorityCode: row.authority?.code ?? null,
    certificationAuthorityName: row.authority?.name ?? null,
    certificationLevelId: row.certificationLevelId,
    certificationLevelCode: row.level?.code ?? null,
    certificationLevelName: row.level?.name ?? null,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    curricula: row.courseCurricula.map((cc) => ({
      id: cc.curriculum.id,
      courseCurriculumId: cc.id,
      cycleName: cc.curriculum.cycleName,
      isActive: cc.isActive,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Admin (course.view) sees all courses. HOD scoping is applied by the
   * controller via `departmentScopeId` — never derived from user-supplied
   * query params.
   */
  async findAll(
    params: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
      certificationAuthorityId?: number;
      certificationLevelId?: number;
      curriculumId?: number;
      sortBy?: string;
      sortDirection?: string;
    },
    departmentScopeId?: number | null,
  ) {
    const {
      page,
      limit,
      search,
      status,
      certificationAuthorityId,
      certificationLevelId,
      curriculumId,
    } = params;

    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      ...(departmentScopeId !== undefined
        ? { departmentId: departmentScopeId }
        : {}),
      ...(certificationAuthorityId ? { certificationAuthorityId } : {}),
      ...(certificationLevelId ? { certificationLevelId } : {}),
      ...(curriculumId ? { courseCurricula: { some: { curriculumId } } } : {}),
      ...(status === 'active'
        ? { isActive: true }
        : status === 'inactive'
          ? { isActive: false }
          : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { initials: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CourseOrderByWithRelationInput[] = [];
    if (params.sortBy === 'authority') {
      orderBy.push({
        authority: { name: params.sortDirection === 'asc' ? 'asc' : 'desc' },
      });
    } else if (
      params.sortBy === 'code' ||
      params.sortBy === 'initials' ||
      params.sortBy === 'name'
    ) {
      orderBy.push({
        [params.sortBy]: params.sortDirection === 'asc' ? 'asc' : 'desc',
      });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }
    orderBy.push({ id: 'desc' });

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: COURSE_LIST_SELECT,
      }),
    ]);

    return {
      items: rows.map((row) => toView({ ...row, courseCurricula: [] })),
      total,
      page,
      limit,
    };
  }

  async findOneById(id: number) {
    const row = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
      select: COURSE_SELECT,
    });
    if (!row) {
      throw new NotFoundException(`Course with id '${id}' not found`);
    }
    return toView(row);
  }

  async create(dto: CreateCourseDto, actorId: number) {
    await this.assertUnique(dto.code, dto.name);
    await this.assertRelations(
      dto.certificationAuthorityId,
      dto.certificationLevelId,
      dto.departmentId,
    );
    await this.assertCurriculumBelongsToAuthority(
      dto.curriculumId,
      dto.certificationAuthorityId,
    );

    const row = await this.prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          code: dto.code.trim(),
          initials: dto.initials.trim(),
          name: dto.name.trim(),
          durationMonths: dto.durationMonths ?? null,
          description: dto.description ?? null,
          isActive: dto.isActive ?? true,
          certificationAuthorityId: dto.certificationAuthorityId,
          certificationLevelId: dto.certificationLevelId,
          departmentId: dto.departmentId,
          createdBy: actorId,
          updatedBy: actorId,
        },
        select: COURSE_SELECT,
      });

      try {
        await tx.courseCurriculum.create({
          data: {
            courseId: course.id,
            curriculumId: dto.curriculumId,
            createdBy: actorId,
            updatedBy: actorId,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictException(
            'This curriculum is already linked to the course',
          );
        }
        throw err;
      }

      return course;
    });

    await this.audit.log('course.create', actorId, 'Course', row.id, {
      newValues: { code: row.code, name: row.name },
    });

    return toView(row);
  }

  async update(id: number, dto: UpdateCourseDto, actorId: number) {
    const existing = await this.findLeanById(id);
    await this.assertUnique(dto.code, dto.name, id);

    const authorityId =
      dto.certificationAuthorityId ?? existing.certificationAuthorityId;
    const levelId = dto.certificationLevelId ?? existing.certificationLevelId;
    const departmentId = dto.departmentId ?? existing.departmentId;
    await this.assertRelations(authorityId, levelId, departmentId);

    const row = await this.prisma.course.update({
      where: { id },
      data: {
        code: dto.code?.trim(),
        initials: dto.initials?.trim(),
        name: dto.name?.trim(),
        durationMonths: dto.durationMonths,
        description: dto.description,
        isActive: dto.isActive,
        certificationAuthorityId: dto.certificationAuthorityId,
        certificationLevelId: dto.certificationLevelId,
        departmentId: dto.departmentId,
        updatedBy: actorId,
      },
      select: COURSE_SELECT,
    });

    await this.audit.log('course.update', actorId, 'Course', id, {
      oldValues: { code: existing.code, name: existing.name },
      newValues: { code: row.code, name: row.name },
    });

    return toView(row);
  }

  /** Soft delete — courses keep history/audit integrity. */
  async remove(id: number, actorId: number): Promise<void> {
    await this.findLeanById(id);
    await this.prisma.course.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
    });
    await this.audit.log('course.delete', actorId, 'Course', id, {});
  }

  private async findLeanById(id: number) {
    const row = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        certificationAuthorityId: true,
        certificationLevelId: true,
        departmentId: true,
      },
    });
    if (!row) {
      throw new NotFoundException(`Course with id '${id}' not found`);
    }
    return row;
  }

  /** The department id the user belongs to via their staff profile (HOD). */
  async resolveHodDepartmentId(userId: number): Promise<number | null> {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { departmentId: true },
    });
    return staff?.departmentId ?? null;
  }

  async getMyDepartment(userId: number) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { userId, deletedAt: null },
      select: {
        departmentId: true,
        department: { select: { id: true, name: true, deletedAt: true } },
      },
    });
    if (!staff?.department || staff.department.deletedAt) {
      return null;
    }
    return { id: staff.department.id, name: staff.department.name };
  }

  /* ------------------------- Meta lookups ------------------------- */

  async listAuthorityOptions(search?: string, limit = 10) {
    const rows = await this.prisma.certificationAuthority.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: { id: true, code: true, name: true },
    });
    return rows.map((row) => ({
      id: row.id,
      label: `${row.code} ${row.name}`,
    }));
  }

  async listLevelOptions(authorityId: number, search?: string, limit = 10) {
    const rows = await this.prisma.certificationLevel.findMany({
      where: {
        certificationAuthorityId: authorityId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(limit, 1), 500),
      select: { id: true, code: true, name: true },
    });
    return rows.map((row) => ({
      id: row.id,
      label: `${row.name} (${row.code})`,
    }));
  }

  async listCurriculumOptions(
    authorityId: number,
    search?: string,
    limit = 10,
  ) {
    const rows = await this.prisma.curriculum.findMany({
      where: {
        certificationAuthorityId: authorityId,
        isActive: true,
        ...(search
          ? { cycleName: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { cycleName: 'asc' },
      take: Math.min(Math.max(limit, 1), 500),
      select: { id: true, cycleName: true },
    });
    return rows.map((row) => ({ id: row.id, label: row.cycleName }));
  }

  /** Active course-curriculum links for a course — what is open for enrolment. */
  async listCourseCurriculumOptions(courseId: number) {
    const rows = await this.prisma.courseCurriculum.findMany({
      where: { courseId, isActive: true },
      orderBy: { curriculum: { cycleName: 'asc' } },
      include: { curriculum: { select: { id: true, cycleName: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.curriculum.cycleName,
    }));
  }

  async listDepartmentOptions(search?: string, limit = 10) {
    const rows = await this.prisma.department.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: { id: true, code: true, name: true },
    });
    return rows.map((row) => ({
      id: row.id,
      label: `${row.name} (${row.code})`,
    }));
  }

  /* ------------------------- Guards ------------------------- */

  private async assertUnique(
    code?: string,
    name?: string,
    excludeId?: number,
  ): Promise<void> {
    if (!code && !name) return;
    if (code) {
      const existingCode = await this.prisma.course.findFirst({
        where: {
          code: { equals: code.trim(), mode: 'insensitive' },
          deletedAt: null,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (existingCode) {
        throw new ConflictException('A course with this code already exists');
      }
    }
    if (name) {
      const existingName = await this.prisma.course.findFirst({
        where: {
          name: { equals: name.trim(), mode: 'insensitive' },
          deletedAt: null,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (existingName) {
        throw new ConflictException(
          'A course with this name already exists. Course names are unique.',
        );
      }
    }
  }

  private async assertRelations(
    authorityId: number | null,
    levelId: number | null,
    departmentId: number | null,
  ): Promise<void> {
    if (authorityId) {
      const authority = await this.prisma.certificationAuthority.findUnique({
        where: { id: authorityId },
        select: { id: true },
      });
      if (!authority) {
        throw new BadRequestException(
          'Selected certification authority does not exist',
        );
      }
    }

    if (levelId) {
      const level = await this.prisma.certificationLevel.findFirst({
        where: {
          id: levelId,
          ...(authorityId ? { certificationAuthorityId: authorityId } : {}),
        },
        select: { id: true },
      });
      if (!level) {
        throw new BadRequestException(
          authorityId
            ? 'Selected certification level does not exist under this authority'
            : 'Selected certification level does not exist',
        );
      }
    }

    if (departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: departmentId, deletedAt: null },
        select: { id: true },
      });
      if (!department) {
        throw new BadRequestException('Selected department does not exist');
      }
    }
  }

  private async assertCurriculumBelongsToAuthority(
    curriculumId: number,
    authorityId: number,
  ): Promise<void> {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id: curriculumId, certificationAuthorityId: authorityId },
      select: { id: true },
    });
    if (!curriculum) {
      throw new BadRequestException(
        'Selected curriculum does not exist under this certification authority',
      );
    }
  }
}
