import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTimetableEntryDto } from './dto/create-timetable-entry.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';

const ENTRY_SELECT = {
  id: true,
  academicSessionId: true,
  unitId: true,
  trainerStaffId: true,
  lectureRoomId: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  type: true,
  recurrence: true,
  date: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  unit: { select: { id: true, code: true, name: true } },
  trainerStaff: {
    select: {
      id: true,
      employeeNumber: true,
      user: { select: { id: true, name: true, firstName: true, lastName: true } },
    },
  },
  room: { select: { id: true, name: true, code: true } },
} satisfies Prisma.AcademicTimetableSelect;

type EntryRecord = {
  id: number;
  academicSessionId: number;
  unitId: number;
  trainerStaffId: number | null;
  lectureRoomId: number | null;
  dayOfWeek: number;
  startTime: Date;
  endTime: Date;
  type: string;
  recurrence: string;
  date: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  unit: { id: number; code: string; name: string };
  trainerStaff: {
    id: number;
    employeeNumber: string | null;
    user: { id: number; name: string; firstName: string | null; lastName: string | null };
  } | null;
  room: { id: number; name: string; code: string } | null;
};

function toTimeString(value: Date): string {
  const date =
    value instanceof Date
      ? value
      : new Date(value);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(
    date.getUTCMinutes(),
  ).padStart(2, '0')}`;
}

function toView(row: EntryRecord) {
  return {
    id: row.id,
    academicSessionId: row.academicSessionId,
    unitId: row.unitId,
    trainerStaffId: row.trainerStaffId,
    lectureRoomId: row.lectureRoomId,
    dayOfWeek: row.dayOfWeek,
    startTime: toTimeString(row.startTime),
    endTime: toTimeString(row.endTime),
    type: row.type,
    recurrence: row.recurrence,
    date: row.date ? row.date.toISOString().slice(0, 10) : null,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    unit: row.unit,
    trainer: row.trainerStaff
      ? {
          id: row.trainerStaff.id,
          employeeNumber: row.trainerStaff.employeeNumber,
          name: row.trainerStaff.user.firstName || row.trainerStaff.user.name,
        }
      : null,
    room: row.room,
  };
}

@Injectable()
export class TimetablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** All timetable entries for a session, grouped-ready (flat, ordered by day/time). */
  async listForSession(sessionId: number) {
    await this.assertSession(sessionId);
    const rows = await this.prisma.academicTimetable.findMany({
      where: { academicSessionId: sessionId, deletedAt: null },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      select: ENTRY_SELECT,
    });
    return rows.map(toView);
  }

  /** Staff who can be assigned as trainers (teaching staff first). */
  async listTrainers() {
    const rows = await this.prisma.staffProfile.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        employeeNumber: true,
        isTeachingStaff: true,
        user: {
          select: { id: true, name: true, firstName: true, lastName: true, email: true },
        },
      },
      take: 500,
    });
    return rows.map((row) => ({
      id: row.id,
      employeeNumber: row.employeeNumber,
      isTeachingStaff: row.isTeachingStaff,
      name: row.user.firstName || row.user.name,
      email: row.user.email,
    }));
  }

  /** Units that have no timetable entry in the given session yet. */
  async listAvailableUnits(sessionId: number) {
    await this.assertSession(sessionId);
    const rows = await this.prisma.unit.findMany({
      where: {
        isActive: true,
        timetables: {
          none: { academicSessionId: sessionId, deletedAt: null },
        },
      },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
    return rows;
  }

  async findOneById(id: number) {
    const row = await this.prisma.academicTimetable.findFirst({
      where: { id, deletedAt: null },
      select: ENTRY_SELECT,
    });
    if (!row) {
      throw new NotFoundException(`Timetable entry with id '${id}' not found`);
    }
    return toView(row);
  }

  async create(dto: CreateTimetableEntryDto, actorId: number) {
    await this.assertSession(dto.academicSessionId);
    await this.assertUnit(dto.unitId);
    if (dto.lectureRoomId !== undefined) {
      await this.assertRoom(dto.lectureRoomId);
    }
    if (dto.trainerStaffId !== undefined) {
      await this.assertTrainer(dto.trainerStaffId);
    }
    this.assertTimeRange(dto.startTime, dto.endTime);

    await this.assertNoOverlap({
      sessionId: dto.academicSessionId,
      roomId: dto.lectureRoomId,
      trainerStaffId: dto.trainerStaffId,
      unitId: dto.unitId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      excludeId: undefined,
    });

    const row = await this.prisma.academicTimetable.create({
      data: {
        academicSessionId: dto.academicSessionId,
        unitId: dto.unitId,
        trainerStaffId: dto.trainerStaffId ?? null,
        lectureRoomId: dto.lectureRoomId ?? null,
        dayOfWeek: dto.dayOfWeek,
        startTime: timeToDate(dto.startTime),
        endTime: timeToDate(dto.endTime),
        type: dto.type ?? 'lecture',
        recurrence: dto.recurrence ?? 'weekly',
        date: dto.date ? new Date(dto.date) : null,
        notes: dto.notes ?? null,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: ENTRY_SELECT,
    });

    await this.audit.log('timetable.create', actorId, 'AcademicTimetable', row.id, {
      newValues: {
        unitId: row.unitId,
        dayOfWeek: row.dayOfWeek,
        startTime: toTimeString(row.startTime),
        endTime: toTimeString(row.endTime),
      },
    });

    return toView(row);
  }

  async update(id: number, dto: UpdateTimetableEntryDto, actorId: number) {
    const existing = await this.findOneById(id);

    const sessionId = dto.academicSessionId ?? existing.academicSessionId;
    const unitId = dto.unitId ?? existing.unitId;
    const roomId = dto.lectureRoomId !== undefined ? dto.lectureRoomId : existing.lectureRoomId;
    const trainerStaffId =
      dto.trainerStaffId !== undefined ? dto.trainerStaffId : existing.trainerStaffId;
    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;

    if (sessionId !== existing.academicSessionId) await this.assertSession(sessionId);
    if (unitId !== existing.unitId) await this.assertUnit(unitId);
    if (roomId !== null && roomId !== undefined && roomId !== existing.lectureRoomId) {
      await this.assertRoom(roomId);
    }
    if (
      trainerStaffId !== null &&
      trainerStaffId !== undefined &&
      trainerStaffId !== existing.trainerStaffId
    ) {
      await this.assertTrainer(trainerStaffId);
    }
    this.assertTimeRange(startTime, endTime);

    await this.assertNoOverlap({
      sessionId,
      roomId,
      trainerStaffId,
      unitId,
      dayOfWeek,
      startTime,
      endTime,
      excludeId: id,
    });

    const row = await this.prisma.academicTimetable.update({
      where: { id },
      data: {
        academicSessionId: dto.academicSessionId,
        unitId: dto.unitId,
        trainerStaffId: dto.trainerStaffId === null ? null : dto.trainerStaffId,
        lectureRoomId: dto.lectureRoomId === null ? null : dto.lectureRoomId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime ? timeToDate(dto.startTime) : undefined,
        endTime: dto.endTime ? timeToDate(dto.endTime) : undefined,
        type: dto.type,
        recurrence: dto.recurrence,
        date: dto.date ? new Date(dto.date) : undefined,
        notes: dto.notes,
        updatedBy: actorId,
      },
      select: ENTRY_SELECT,
    });

    await this.audit.log('timetable.update', actorId, 'AcademicTimetable', id, {
      oldValues: { unitId: existing.unitId, dayOfWeek: existing.dayOfWeek },
      newValues: { unitId: row.unitId, dayOfWeek: row.dayOfWeek },
    });

    return toView(row);
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.findOneById(id);
    await this.prisma.academicTimetable.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
    });
    await this.audit.log('timetable.delete', actorId, 'AcademicTimetable', id, {});
  }

  /* ------------------------- Guards & helpers ------------------------- */

  private async assertSession(sessionId: number) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException(`Academic session with id '${sessionId}' not found`);
    }
  }

  private async assertUnit(unitId: number) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true, isActive: true },
    });
    if (!unit || !unit.isActive) {
      throw new BadRequestException('Selected unit does not exist or is inactive');
    }
  }

  private async assertRoom(roomId: number) {
    const room = await this.prisma.lectureRoom.findFirst({
      where: { id: roomId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!room) {
      throw new BadRequestException('Selected lecture room does not exist or is inactive');
    }
  }

  private async assertTrainer(staffId: number) {
    const staff = await this.prisma.staffProfile.findFirst({
      where: { id: staffId, deletedAt: null },
      select: { id: true },
    });
    if (!staff) {
      throw new BadRequestException('Selected trainer does not exist');
    }
  }

  private assertTimeRange(start: string, end: string) {
    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }
  }

  private async assertNoOverlap(params: {
    sessionId: number;
    roomId: number | null | undefined;
    trainerStaffId: number | null | undefined;
    unitId: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    excludeId?: number;
  }) {
    const { sessionId, roomId, trainerStaffId, unitId, dayOfWeek, startTime, endTime } = params;
    const overlapping: Prisma.AcademicTimetableWhereInput[] = [];

    const timeOverlap: Prisma.AcademicTimetableWhereInput[] = [
      { startTime: { lt: timeToDate(endTime) } },
      { endTime: { gt: timeToDate(startTime) } },
    ];

    if (roomId) {
      overlapping.push({
        lectureRoomId: roomId,
        AND: timeOverlap,
      });
    }
    if (trainerStaffId) {
      overlapping.push({
        trainerStaffId,
        AND: timeOverlap,
      });
    }

    const clash = await this.prisma.academicTimetable.findFirst({
      where: {
        academicSessionId: sessionId,
        dayOfWeek,
        deletedAt: null,
        ...(params.excludeId ? { NOT: { id: params.excludeId } } : {}),
        AND: overlapping.length === 1 ? overlapping[0] : { OR: overlapping },
      },
      select: { id: true },
    });

    if (clash) {
      throw new ConflictException(
        'Timetable conflict: the room or trainer already has a class at this time',
      );
    }

    // A unit must not be double-booked at the same time.
    const unitClash = await this.prisma.academicTimetable.findFirst({
      where: {
        academicSessionId: sessionId,
        unitId,
        dayOfWeek,
        deletedAt: null,
        AND: timeOverlap,
        ...(params.excludeId ? { NOT: { id: params.excludeId } } : {}),
      },
      select: { id: true },
    });
    if (unitClash) {
      throw new ConflictException('This unit already has a class at that time');
    }
  }
}

function timeToDate(value: string): Date {
  const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
  const date = new Date(0);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}
