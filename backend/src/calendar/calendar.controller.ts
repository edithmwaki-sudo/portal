import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import {
  CalendarEventDto,
  CalendarEventTypeDto,
} from './dto/calendar-event-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('calendar')
@ApiBearerAuth('access-token')
@Controller()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('calendar/event-types')
  @RequirePermission(Permissions.canViewCalendar)
  @ApiOperation({ summary: 'List calendar event types' })
  async listEventTypes() {
    const types = await this.calendarService.listEventTypes();
    return plainToInstance(CalendarEventTypeDto, types, {
      excludeExtraneousValues: true,
    });
  }

  @Get('academic-sessions/:sessionId/calendar')
  @RequirePermission(Permissions.canViewCalendar)
  @ApiOperation({
    summary: 'Get a session calendar (events + computed weekends)',
  })
  async getSessionCalendar(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const result = await this.calendarService.getSessionCalendar(sessionId);
    result.events = plainToInstance(CalendarEventDto, result.events, {
      excludeExtraneousValues: true,
    });
    return result;
  }

  @Get('academic-years/:yearId/calendar')
  @RequirePermission(Permissions.canViewCalendar)
  @ApiOperation({ summary: 'Get a year calendar (events across sessions)' })
  async getYearCalendar(@Param('yearId', ParseIntPipe) yearId: number) {
    const result = await this.calendarService.getYearCalendar(yearId);
    result.events = plainToInstance(CalendarEventDto, result.events, {
      excludeExtraneousValues: true,
    });
    return result;
  }

  @Post('academic-sessions/:sessionId/calendar/generate')
  @RequirePermission(Permissions.canGenerateCalendar)
  @ApiOperation({
    summary: 'Regenerate system events (holidays) for a session',
  })
  async generate(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.calendarService.generate(sessionId, actor.userId);
  }

  @Post('academic-sessions/:sessionId/calendar/sync-holidays')
  @RequirePermission(Permissions.canSyncCalendarHolidays)
  @ApiOperation({ summary: 'Sync Kenyan public holidays from Nager.Date' })
  async syncHolidays(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.calendarService.syncHolidays(sessionId, actor.userId);
  }

  @Post('academic-sessions/:sessionId/calendar/events')
  @RequirePermission(Permissions.canAddCalendarEvent)
  @ApiOperation({ summary: 'Create a manual calendar event' })
  @ApiCreatedResponse({ type: CalendarEventDto })
  async createEvent(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: CreateCalendarEventDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const event = await this.calendarService.createEvent(
      sessionId,
      dto,
      actor.userId,
    );
    return plainToInstance(CalendarEventDto, event, {
      excludeExtraneousValues: true,
    });
  }

  @Put('academic-sessions/:sessionId/calendar/events/:eventId')
  @RequirePermission(Permissions.canEditCalendarEvent)
  @ApiOperation({ summary: 'Update a calendar event' })
  @ApiOkResponse({ type: CalendarEventDto })
  async updateEvent(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: UpdateCalendarEventDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const event = await this.calendarService.updateEvent(
      sessionId,
      eventId,
      dto,
      actor.userId,
    );
    return plainToInstance(CalendarEventDto, event, {
      excludeExtraneousValues: true,
    });
  }

  @Delete('academic-sessions/:sessionId/calendar/events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canDeleteCalendarEvent)
  @ApiOperation({ summary: 'Delete a manual calendar event' })
  async deleteEvent(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.calendarService.deleteEvent(sessionId, eventId, actor.userId);
  }
}
