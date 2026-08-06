import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLectureRoomDto } from './dto/create-lecture-room.dto';
import { UpdateLectureRoomDto } from './dto/update-lecture-room.dto';

const ROOM_SELECT = {
  id: true,
  name: true,
  code: true,
  capacity: true,
  location: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LectureRoomSelect;

@Injectable()
export class LectureRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    all?: boolean;
  }) {
    const { search, status } = params;
    const all = params.all === true;
    const page = params.page ?? 1;
    const limit = params.limit ?? 25;

    const where: Prisma.LectureRoomWhereInput = {
      deletedAt: null,
      ...(status === 'active'
        ? { isActive: true }
        : status === 'inactive'
          ? { isActive: false }
          : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (all) {
      const rows = await this.prisma.lectureRoom.findMany({
        where,
        orderBy: { name: 'asc' },
        select: ROOM_SELECT,
      });
      return { items: rows, total: rows.length, page: 1, limit: rows.length };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.lectureRoom.count({ where }),
      this.prisma.lectureRoom.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: ROOM_SELECT,
      }),
    ]);

    return { items: rows, total, page, limit };
  }

  async findOneById(id: number) {
    const row = await this.prisma.lectureRoom.findFirst({
      where: { id, deletedAt: null },
      select: ROOM_SELECT,
    });
    if (!row) {
      throw new NotFoundException(`Lecture room with id '${id}' not found`);
    }
    return row;
  }

  async create(dto: CreateLectureRoomDto, actorId: number) {
    const name = dto.name.trim();
    const code = dto.code.trim().toUpperCase();
    await this.assertUnique({ name, code });

    const row = await this.prisma.lectureRoom.create({
      data: {
        name,
        code,
        capacity: dto.capacity ?? null,
        location: dto.location ?? null,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: ROOM_SELECT,
    });

    await this.audit.log('room.create', actorId, 'LectureRoom', row.id, {
      newValues: { name: row.name, code: row.code },
    });

    return row;
  }

  async update(id: number, dto: UpdateLectureRoomDto, actorId: number) {
    const existing = await this.findOneById(id);
    const name = dto.name?.trim() ?? existing.name;
    const code = dto.code?.trim().toUpperCase() ?? existing.code;
    await this.assertUnique({ name, code }, id);

    const row = await this.prisma.lectureRoom.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        code: dto.code?.trim().toUpperCase(),
        capacity: dto.capacity,
        location: dto.location,
        description: dto.description,
        isActive: dto.isActive,
        updatedBy: actorId,
      },
      select: ROOM_SELECT,
    });

    await this.audit.log('room.update', actorId, 'LectureRoom', id, {
      oldValues: { name: existing.name, code: existing.code },
      newValues: { name: row.name, code: row.code },
    });

    return row;
  }

  async remove(id: number, actorId: number): Promise<void> {
    const room = await this.findOneById(id);

    const timetables = await this.prisma.academicTimetable.findFirst({
      where: { lectureRoomId: id, deletedAt: null },
      select: { id: true },
    });
    if (timetables) {
      throw new ConflictException(
        'This room is referenced by timetable entries and cannot be deleted',
      );
    }

    await this.prisma.lectureRoom.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId },
    });

    await this.audit.log('room.delete', actorId, 'LectureRoom', id, {
      oldValues: { name: room.name, code: room.code },
    });
  }

  private async assertUnique(
    fields: { name: string; code: string },
    excludeId?: number,
  ) {
    const existing = await this.prisma.lectureRoom.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { name: { equals: fields.name, mode: 'insensitive' } },
          { code: { equals: fields.code, mode: 'insensitive' } },
        ],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'A lecture room with this name or code already exists',
      );
    }
  }
}
