import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCourseFeeAssignmentDto } from './dto/create-course-fee-assignment.dto';
import { UpdateCourseFeeAssignmentDto } from './dto/update-course-fee-assignment.dto';

const ASSIGNMENT_INCLUDE = {
  course: { select: { id: true, code: true, name: true } },
  curriculum: { select: { id: true, cycleName: true } },
  academicYear: { select: { id: true, name: true } },
  academicSession: { select: { id: true, name: true } },
  feeStructure: {
    select: {
      id: true,
      feeName: true,
      status: true,
      _count: { select: { items: true } },
    },
  },
} satisfies Prisma.CourseFeeAssignmentInclude;

type AssignmentRow = {
  id: number;
  courseId: number;
  curriculumId: number;
  academicYearId: number;
  academicSessionId: number;
  feeStructureId: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  remarks: string | null;
  status: FeeStatus;
  createdAt: Date;
  updatedAt: Date;
  course: { id: number; code: string; name: string };
  curriculum: { id: number; cycleName: string };
  academicYear: { id: number; name: string };
  academicSession: { id: number; name: string };
  feeStructure: {
    id: number;
    feeName: string;
    status: FeeStatus;
    _count: { items: number };
  };
};

function toView(row: AssignmentRow) {
  return {
    id: row.id,
    courseId: row.courseId,
    courseCode: row.course.code,
    courseName: row.course.name,
    curriculumId: row.curriculumId,
    curriculumName: row.curriculum.cycleName,
    academicYearId: row.academicYearId,
    academicYearName: row.academicYear.name,
    academicSessionId: row.academicSessionId,
    academicSessionName: row.academicSession.name,
    feeStructureId: row.feeStructureId,
    feeStructureName: row.feeStructure.feeName,
    feeStructureStatus: row.feeStructure.status,
    itemsCount: row.feeStructure._count.items,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    remarks: row.remarks,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class CourseFeeAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    courseId?: number;
    curriculumId?: number;
    academicYearId?: number;
    academicSessionId?: number;
  }) {
    const { page, limit } = params;
    const where: Prisma.CourseFeeAssignmentWhereInput = {
      deletedAt: null,
      ...(params.status === 'active'
        ? { status: FeeStatus.ACTIVE }
        : params.status === 'inactive'
          ? { status: FeeStatus.INACTIVE }
          : {}),
      ...(params.courseId ? { courseId: params.courseId } : {}),
      ...(params.curriculumId ? { curriculumId: params.curriculumId } : {}),
      ...(params.academicYearId
        ? { academicYearId: params.academicYearId }
        : {}),
      ...(params.academicSessionId
        ? { academicSessionId: params.academicSessionId }
        : {}),
      ...(params.search
        ? {
            OR: [
              {
                course: {
                  name: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                course: {
                  code: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                feeStructure: {
                  feeName: { contains: params.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.courseFeeAssignment.count({ where }),
      this.prisma.courseFeeAssignment.findMany({
        where,
        include: ASSIGNMENT_INCLUDE,
        orderBy: [
          { academicYear: { startDate: 'desc' } },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items: rows.map(toView), total, page, limit };
  }

  async findOneById(id: number) {
    const row = await this.prisma.courseFeeAssignment.findFirst({
      where: { id, deletedAt: null },
      include: ASSIGNMENT_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException(
        `Course fee assignment with id '${id}' not found`,
      );
    }
    return toView(row);
  }

  async create(dto: CreateCourseFeeAssignmentDto, actorId: number) {
    await this.assertReferencesExist(dto);
    if ((dto.status ?? FeeStatus.ACTIVE) === FeeStatus.ACTIVE) {
      await this.assertNoActiveConflict({
        courseId: dto.courseId,
        curriculumId: dto.curriculumId,
        academicYearId: dto.academicYearId,
        academicSessionId: dto.academicSessionId,
      });
    }

    const row = await this.prisma.courseFeeAssignment.create({
      data: {
        courseId: dto.courseId,
        curriculumId: dto.curriculumId,
        academicYearId: dto.academicYearId,
        academicSessionId: dto.academicSessionId,
        feeStructureId: dto.feeStructureId,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        remarks: dto.remarks ?? null,
        status: dto.status ?? FeeStatus.ACTIVE,
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: ASSIGNMENT_INCLUDE,
    });

    await this.audit.log(
      'course_fee_assignment.create',
      actorId,
      'CourseFeeAssignment',
      row.id,
      {
        newValues: {
          courseId: row.courseId,
          feeStructureId: row.feeStructureId,
        },
      },
    );

    return toView(row);
  }

  async update(id: number, dto: UpdateCourseFeeAssignmentDto, actorId: number) {
    const existing = await this.findOneById(id);
    if (dto.feeStructureId !== undefined) {
      await this.assertFeeStructureExists(dto.feeStructureId);
    }
    if (dto.status === FeeStatus.ACTIVE) {
      await this.assertNoActiveConflict(
        {
          courseId: existing.courseId,
          curriculumId: existing.curriculumId,
          academicYearId: existing.academicYearId,
          academicSessionId: existing.academicSessionId,
        },
        id,
      );
    }

    const row = await this.prisma.courseFeeAssignment.update({
      where: { id },
      data: {
        feeStructureId: dto.feeStructureId,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : undefined,
        effectiveTo:
          dto.effectiveTo === null
            ? null
            : dto.effectiveTo
              ? new Date(dto.effectiveTo)
              : undefined,
        remarks: dto.remarks,
        status: dto.status,
        updatedBy: actorId,
      },
      include: ASSIGNMENT_INCLUDE,
    });

    await this.audit.log(
      'course_fee_assignment.update',
      actorId,
      'CourseFeeAssignment',
      id,
      {
        oldValues: {
          feeStructureId: existing.feeStructureId,
          status: existing.status,
        },
        newValues: { feeStructureId: row.feeStructureId, status: row.status },
      },
    );

    return toView(row);
  }

  /**
   * Soft delete only. Assignments are versioned — a changed fee for the next
   * academic year is a NEW assignment, never an overwrite of this one, so
   * historical billing references stay intact.
   */
  async remove(id: number, actorId: number): Promise<void> {
    await this.findOneById(id);
    await this.prisma.courseFeeAssignment.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
    });
    await this.audit.log(
      'course_fee_assignment.delete',
      actorId,
      'CourseFeeAssignment',
      id,
      {},
    );
  }

  /** Batched existence check for all referenced entities (no N+1). */
  private async assertReferencesExist(dto: CreateCourseFeeAssignmentDto) {
    const [course, curriculum, year, session, structure] =
      await this.prisma.$transaction([
        this.prisma.course.findFirst({
          where: { id: dto.courseId, deletedAt: null },
          select: { id: true },
        }),
        this.prisma.curriculum.findUnique({
          where: { id: dto.curriculumId },
          select: { id: true },
        }),
        this.prisma.academicYear.findUnique({
          where: { id: dto.academicYearId },
          select: { id: true },
        }),
        this.prisma.academicSession.findUnique({
          where: { id: dto.academicSessionId },
          select: { id: true },
        }),
        this.prisma.feeStructure.findFirst({
          where: { id: dto.feeStructureId, deletedAt: null },
          select: { id: true },
        }),
      ]);

    if (!course) {
      throw new BadRequestException(
        `Course with id '${dto.courseId}' not found or was deleted`,
      );
    }
    if (!curriculum) {
      throw new BadRequestException(
        `Curriculum with id '${dto.curriculumId}' not found`,
      );
    }
    if (!year) {
      throw new BadRequestException(
        `Academic year with id '${dto.academicYearId}' not found`,
      );
    }
    if (!session) {
      throw new BadRequestException(
        `Academic session with id '${dto.academicSessionId}' not found`,
      );
    }
    if (!structure) {
      throw new BadRequestException(
        `Fee structure with id '${dto.feeStructureId}' not found or was deleted`,
      );
    }
  }

  private async assertFeeStructureExists(feeStructureId: number) {
    const structure = await this.prisma.feeStructure.findFirst({
      where: { id: feeStructureId, deletedAt: null },
      select: { id: true, feeName: true },
    });
    if (!structure) {
      throw new BadRequestException(
        `Fee structure with id '${feeStructureId}' not found or was deleted`,
      );
    }
  }

  /** Only ONE active assignment may exist for the same academic context. */
  private async assertNoActiveConflict(
    context: {
      courseId: number;
      curriculumId: number;
      academicYearId: number;
      academicSessionId: number;
    },
    excludeId?: number,
  ) {
    const existing = await this.prisma.courseFeeAssignment.findFirst({
      where: {
        deletedAt: null,
        status: FeeStatus.ACTIVE,
        ...context,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: {
        id: true,
        feeStructure: { select: { feeName: true } },
      },
    });
    if (existing) {
      throw new ConflictException(
        `An active fee assignment (${existing.feeStructure.feeName}) already ` +
          'exists for this course, curriculum, academic year and session. ' +
          'Deactivate it first, or create a new assignment for a different period.',
      );
    }
  }
}
