import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';

const EVENT_SELECT = {
  id: true,
  academicYearId: true,
  academicSessionId: true,
  eventTypeId: true,
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  source: true,
  isLocked: true,
  createdAt: true,
  updatedAt: true,
  eventType: {
    select: { id: true, code: true, label: true, colorHex: true },
  },
} satisfies Prisma.CalendarEventSelect;

type EventRecord = {
  id: number;
  academicYearId: number;
  academicSessionId: number;
  eventTypeId: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  source: string;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  eventType: { id: number; code: string; label: string; colorHex: string };
};

function toView(row: EventRecord) {
  return { ...row };
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listEventTypes() {
    return this.prisma.calendarEventType.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, code: true, label: true, colorHex: true },
    });
  }

  async getSessionCalendar(sessionId: number) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id: sessionId },
      select: { id: true, name: true, startDate: true, endDate: true },
    });
    if (!session) {
      throw new NotFoundException(`Academic session with id '${sessionId}' not found`);
    }

    const [events, weekends] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: { academicSessionId: sessionId },
        orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }],
        select: EVENT_SELECT,
      }),
      this.computeWeekends(session.startDate, session.endDate),
    ]);

    return {
      session: {
        id: session.id,
        name: session.name,
        startDate: session.startDate,
        endDate: session.endDate,
      },
      weekends,
      events: events.map(toView),
    };
  }

  async getYearCalendar(yearId: number) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id: yearId },
      select: { id: true, name: true, startDate: true, endDate: true },
    });
    if (!year) {
      throw new NotFoundException(`Academic year with id '${yearId}' not found`);
    }

    const sessions = await this.prisma.academicSession.findMany({
      where: { academicYearId: yearId },
      orderBy: { startDate: 'asc' },
      select: { id: true, code: true, name: true },
    });

    const [events, weekends] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: { academicYearId: yearId },
        orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }],
        select: EVENT_SELECT,
      }),
      this.computeWeekends(year.startDate, year.endDate),
    ]);

    return {
      year: { id: year.id, name: year.name, startDate: year.startDate, endDate: year.endDate },
      sessions,
      weekends,
      events: events.map(toView),
    };
  }

  async createEvent(sessionId: number, dto: CreateCalendarEventDto, actorId: number) {
    const session = await this.assertSession(sessionId);
    await this.assertEventType(dto.eventTypeId);
    this.assertDateRange(dto.startDate, dto.endDate);

    const row = await this.prisma.calendarEvent.create({
      data: {
        academicYearId: session.academicYearId,
        academicSessionId: sessionId,
        eventTypeId: dto.eventTypeId,
        title: dto.title.trim(),
        description: dto.description ?? null,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        source: 'manual',
        isLocked: dto.isLocked ?? false,
        createdBy: actorId,
        updatedBy: actorId,
      },
      select: EVENT_SELECT,
    });

    await this.audit.log('calendar.event_create', actorId, 'CalendarEvent', row.id, {
      newValues: { title: row.title, startDate: row.startDate, endDate: row.endDate },
    });

    return toView(row);
  }

  async updateEvent(
    sessionId: number,
    eventId: number,
    dto: UpdateCalendarEventDto,
    actorId: number,
  ) {
    const event = await this.assertEventInSession(sessionId, eventId);

    if (event.isLocked) {
      throw new ForbiddenException('This system event is locked and cannot be edited');
    }
    if (dto.eventTypeId !== undefined) {
      await this.assertEventType(dto.eventTypeId);
    }
    const startDate = dto.startDate ?? event.startDate;
    const endDate = dto.endDate ?? event.endDate;
    this.assertDateRange(startDate, endDate);

    const row = await this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        eventTypeId: dto.eventTypeId,
        title: dto.title?.trim(),
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isLocked: dto.isLocked,
        updatedBy: actorId,
      },
      select: EVENT_SELECT,
    });

    await this.audit.log('calendar.event_update', actorId, 'CalendarEvent', eventId, {
      oldValues: { title: event.title },
      newValues: { title: row.title },
    });

    return toView(row);
  }

  async deleteEvent(sessionId: number, eventId: number, actorId: number): Promise<void> {
    const event = await this.assertEventInSession(sessionId, eventId);
    if (event.source !== 'manual') {
      throw new ForbiddenException('System events cannot be deleted');
    }
    await this.prisma.calendarEvent.delete({ where: { id: eventId } });
    await this.audit.log('calendar.event_delete', actorId, 'CalendarEvent', eventId, {
      oldValues: { title: event.title },
    });
  }

  /** Re-sync Kenyan public holidays from the Nager.Date API (graceful on failure). */
  async syncHolidays(sessionId: number, actorId: number) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id: sessionId },
      select: { id: true, academicYearId: true, startDate: true, endDate: true },
    });
    if (!session) {
      throw new NotFoundException(`Academic session with id '${sessionId}' not found`);
    }
    if (!session.startDate || !session.endDate) {
      throw new BadRequestException(
        'Session must have start and end dates before syncing holidays',
      );
    }

    const holidayType = await this.prisma.calendarEventType.findUnique({
      where: { code: 'holiday' },
      select: { id: true },
    });

    const years = this.yearsBetween(session.startDate, session.endDate);
    let synced = 0;

    try {
      for (const year of years) {
        const response = await fetch(
          `https://date.nager.at/api/v3/publicholidays/${year}/KE`,
        );
        if (!response.ok) continue;
        const holidays = (await response.json()) as {
          date: string;
          name?: string;
        }[];
        for (const holiday of holidays) {
          const start = new Date(holiday.date);
          if (start < session.startDate || start > session.endDate) continue;
          const existing = await this.prisma.calendarEvent.findFirst({
            where: {
              academicSessionId: sessionId,
              source: 'system_api',
              eventTypeId: holidayType?.id,
              startDate: start,
            },
            select: { id: true },
          });
          if (existing) continue;
          if (!holidayType) {
            throw new BadRequestException(
              "The 'holiday' event type is not configured. Run the seed script first.",
            );
          }
          await this.prisma.calendarEvent.create({
            data: {
              academicYearId: session.academicYearId,
              academicSessionId: sessionId,
              eventTypeId: holidayType.id,
              title: holiday.name ?? 'Public Holiday',
              startDate: start,
              endDate: start,
              source: 'system_api',
              createdBy: actorId,
              updatedBy: actorId,
            },
          });
          synced += 1;
        }
      }
    } catch {
      // Nager.Date may be unreachable; report gracefully rather than failing the request.
    }

    return { synced };
  }

  /** Delete system events and re-sync; manual events are preserved. */
  async generate(sessionId: number, actorId: number) {
    await this.assertSession(sessionId);
    await this.prisma.calendarEvent.deleteMany({
      where: {
        academicSessionId: sessionId,
        source: { in: ['system_api', 'system_computed'] },
      },
    });
    const result = await this.syncHolidays(sessionId, actorId);
    return { ...result, note: 'System events regenerated. Manual events preserved.' };
  }

  /* ------------------------- Guards & helpers ------------------------- */

  private async assertSession(sessionId: number) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id: sessionId },
      select: { id: true, academicYearId: true },
    });
    if (!session) {
      throw new NotFoundException(`Academic session with id '${sessionId}' not found`);
    }
    return session;
  }

  private async assertEventType(eventTypeId: number) {
    const type = await this.prisma.calendarEventType.findUnique({
      where: { id: eventTypeId },
      select: { id: true },
    });
    if (!type) {
      throw new BadRequestException('Selected event type does not exist');
    }
  }

  private async assertEventInSession(sessionId: number, eventId: number) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, academicSessionId: sessionId },
      select: { id: true, title: true, startDate: true, endDate: true, source: true, isLocked: true },
    });
    if (!event) {
      throw new NotFoundException(`Calendar event with id '${eventId}' not found`);
    }
    return event;
  }

  private assertDateRange(start: string | Date, end: string | Date) {
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      throw new BadRequestException('Invalid event dates');
    }
    if (e < s) {
      throw new BadRequestException('End date must be on or after start date');
    }
  }

  private yearsBetween(start: Date, end: Date): number[] {
    const years: number[] = [];
    for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
      years.push(year);
    }
    return years;
  }

  /** Weekend days within a date range (never stored, computed on request). */
  private async computeWeekends(
    start: Date | null,
    end: Date | null,
  ): Promise<{ date: Date; day: number; type: string }[]> {
    if (!start || !end) return [];
    const weekends: { date: Date; day: number; type: string }[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cursor <= last) {
      const day = cursor.getDay();
      if (day === 0 || day === 6) {
        weekends.push({ date: new Date(cursor), day, type: 'weekend' });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return weekends;
  }
}
