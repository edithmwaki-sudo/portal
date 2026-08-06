import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TimetablesService } from './timetables.service';
import { CreateTimetableEntryDto } from './dto/create-timetable-entry.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';
import { TimetableEntryDto } from './dto/timetable-entry-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('timetables')
@ApiBearerAuth('access-token')
@Controller('timetables')
export class TimetablesController {
  constructor(private readonly timetablesService: TimetablesService) {}

  @Get('sessions/:sessionId/entries')
  @RequirePermission(Permissions.canViewTimetable, Permissions.canViewMyTimetable)
  @ApiOperation({ summary: 'List timetable entries for a session' })
  @ApiOkResponse({ description: 'Flat list of timetable entries' })
  async listForSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const items = await this.timetablesService.listForSession(sessionId);
    return plainToInstance(TimetableEntryDto, items, {
      excludeExtraneousValues: true,
    });
  }

  @Get('sessions/:sessionId/available-units')
  @RequirePermission(Permissions.canAddTimetable)
  @ApiOperation({ summary: 'Units without a timetable entry in the session' })
  async listAvailableUnits(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.timetablesService.listAvailableUnits(sessionId);
  }

  @Get('trainers')
  @RequirePermission(Permissions.canAddTimetable)
  @ApiOperation({ summary: 'List staff eligible as trainers' })
  async listTrainers() {
    return this.timetablesService.listTrainers();
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewTimetable, Permissions.canViewMyTimetable)
  @ApiOperation({ summary: 'Get a single timetable entry' })
  @ApiOkResponse({ type: TimetableEntryDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const entry = await this.timetablesService.findOneById(id);
    return plainToInstance(TimetableEntryDto, entry, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canAddTimetable)
  @ApiOperation({ summary: 'Create a timetable entry' })
  @ApiCreatedResponse({ type: TimetableEntryDto })
  async create(
    @Body() dto: CreateTimetableEntryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const entry = await this.timetablesService.create(dto, actor.userId);
    return plainToInstance(TimetableEntryDto, entry, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canEditTimetable)
  @ApiOperation({ summary: 'Update a timetable entry' })
  @ApiOkResponse({ type: TimetableEntryDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTimetableEntryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const entry = await this.timetablesService.update(id, dto, actor.userId);
    return plainToInstance(TimetableEntryDto, entry, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canDeleteTimetable)
  @ApiOperation({ summary: 'Delete a timetable entry' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.timetablesService.remove(id, actor.userId);
  }
}
