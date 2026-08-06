import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

const ENTRY_SELECT = {
  id: true,
  unitId: true,
  studentUserId: true,
  trainerUserId: true,
  sessionDate: true,
  startTime: true,
  status: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  studentUser: {
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      studentProfile: { select: { admissionNumber: true } },
    },
  },
} satisfies Prisma.ClassAttendanceSelect;

type EntryRecord = {
  id: number;
  unitId: number;
  studentUserId: number | null;
  trainerUserId: number | null;
  sessionDate: Date;
  startTime: Date;
  status: string;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  studentUser: {
    id: number;
    name: string;
    firstName: string | null;
    lastName: string | null;
    studentProfile: { admissionNumber: string | null } | null;
  } | null;
};

function toTimeString(value: Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(
    date.getUTCMinutes(),
  ).padStart(2, '0')}`;
}

function toView(row: EntryRecord) {
  return {
    id: row.id,
    unitId: row.unitId,
    studentUserId: row.studentUserId,
    trainerUserId: row.trainerUserId,
    sessionDate: row.sessionDate.toISOString().slice(0, 10),
    startTime: toTimeString(row.startTime),
    status: row.status,
    remarks: row.remarks,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    student: row.studentUser
      ? {
          id: row.studentUser.id,
          name: row.studentUser.firstName || row.studentUser.name,
          admissionNumber:
            row.studentUser.studentProfile?.admissionNumber ?? null,
        }
      : null,
  };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Units assigned to the current user as trainer (via their staff profile). */
  async listAssignedUnits(userId: number) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    if (!staff) return [];

    const timetables = await this.prisma.academicTimetable.findMany({
      where: { trainerStaffId: staff.id, deletedAt: null },
      select: {
        unitId: true,
        session: { select: { id: true, name: true, isActive: true } },
      },
      distinct: ['unitId'],
    });

    const units = await this.prisma.unit.findMany({
      where: { id: { in: timetables.map((t) => t.unitId) } },
      select: { id: true, code: true, name: true },
    });

    return units.map((unit) => ({
      ...unit,
      sessions: timetables
        .filter((t) => t.unitId === unit.id)
        .map((t) => t.session),
    }));
  }

  /** Students on the unit's course — the roster to mark against. */
  async listRoster(unitId: number, search?: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: { courseId: true },
    });
    if (!unit) {
      throw new NotFoundException(`Unit with id '${unitId}' not found`);
    }

    const students = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: { in: ['ACTIVE', 'INACTIVE'] },
        studentProfile: {
          is: { courseId: unit.courseId, deletedAt: null },
        },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                {
                  studentProfile: {
                    admissionNumber: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ firstName: 'asc' }],
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        studentProfile: { select: { admissionNumber: true, level: true } },
      },
      take: 500,
    });

    return students.map((s) => ({
      id: s.id,
      name: s.firstName || s.name,
      admissionNumber: s.studentProfile?.admissionNumber ?? null,
      level: s.studentProfile?.level ?? null,
    }));
  }

  /** Attendance already recorded for a unit on a given date/time. */
  async listForSession(unitId: number, sessionDate?: string) {
    const where: Prisma.ClassAttendanceWhereInput = { unitId };
    if (sessionDate) {
      const start = new Date(`${sessionDate}T00:00:00.000Z`);
      const end = new Date(`${sessionDate}T23:59:59.999Z`);
      where.sessionDate = { gte: start, lte: end };
    }
    const rows = await this.prisma.classAttendance.findMany({
      where,
      orderBy: [{ sessionDate: 'desc' }, { startTime: 'asc' }],
      select: ENTRY_SELECT,
    });
    return rows.map(toView);
  }

  /** Bulk mark attendance (upsert by student + date + time). */
  async mark(dto: MarkAttendanceDto, actorUserId: number) {
    await this.assertUnit(dto.unitId);

    const sessionDate = new Date(`${dto.sessionDate}T00:00:00.000Z`);
    const startTime = timeToDate(dto.startTime);
    if (Number.isNaN(sessionDate.getTime())) {
      throw new BadRequestException('Invalid session date');
    }

    const uniqueIds = [...new Set(dto.studentUserIds)];
    const students = await this.prisma.user.findMany({
      where: {
        id: { in: uniqueIds },
        deletedAt: null,
        studentProfile: { isNot: null },
      },
      select: { id: true },
    });
    if (students.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more selected students do not exist',
      );
    }

    const existingRows = await this.prisma.classAttendance.findMany({
      where: {
        studentUserId: { in: uniqueIds },
        sessionDate,
        startTime,
      },
      select: { id: true, studentUserId: true },
    });

    const existingByStudent = new Map(
      existingRows.map((row) => [row.studentUserId, row.id]),
    );
    const toCreate = uniqueIds.filter((id) => !existingByStudent.has(id));
    const existingIds = uniqueIds
      .filter((id) => existingByStudent.has(id))
      .map((id) => existingByStudent.get(id)!);

    const updateData = {
      unitId: dto.unitId,
      trainerUserId: dto.trainerUserId ?? null,
      status: dto.status,
      remarks: dto.remarks ?? null,
      updatedBy: actorUserId,
    };

    await this.prisma.$transaction([
      this.prisma.classAttendance.createMany({
        data: toCreate.map((studentUserId) => ({
          unitId: dto.unitId,
          studentUserId,
          trainerUserId: dto.trainerUserId ?? null,
          sessionDate,
          startTime,
          status: dto.status,
          remarks: dto.remarks ?? null,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })),
        skipDuplicates: true,
      }),
      this.prisma.classAttendance.updateMany({
        where: { id: { in: existingIds } },
        data: updateData,
      }),
    ]);

    const marked = uniqueIds.length;

    await this.audit.log(
      'attendance.mark',
      actorUserId,
      'ClassAttendance',
      null,
      {
        newValues: {
          unitId: dto.unitId,
          sessionDate: dto.sessionDate,
          startTime: dto.startTime,
          status: dto.status,
          count: marked,
        },
      },
    );

    return { marked, status: dto.status };
  }

  private async assertUnit(unitId: number) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, isActive: true },
    });
    if (!unit || !unit.isActive) {
      throw new BadRequestException(
        'Selected unit does not exist or is inactive',
      );
    }
  }
}

function timeToDate(value: string): Date {
  const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
  const date = new Date(0);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}
