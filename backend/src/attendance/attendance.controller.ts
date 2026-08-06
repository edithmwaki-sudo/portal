import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AttendanceEntryDto } from './dto/attendance-entry-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('attendance')
@ApiBearerAuth('access-token')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('my-units')
  @RequirePermission(
    Permissions.canViewAttendance,
    Permissions.canMarkAttendance,
  )
  @ApiOperation({ summary: 'Units assigned to the current trainer' })
  @ApiOkResponse({ description: 'List of assigned units with their sessions' })
  async myUnits(@CurrentUser() actor: AuthenticatedUser) {
    return this.attendanceService.listAssignedUnits(actor.userId);
  }

  @Get('units/:unitId/roster')
  @RequirePermission(
    Permissions.canViewAttendance,
    Permissions.canMarkAttendance,
  )
  @ApiOperation({ summary: 'Student roster for a unit (by course)' })
  @ApiOkResponse({ description: 'List of students on the unit course' })
  async roster(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Query('search') search?: string,
  ) {
    return this.attendanceService.listRoster(unitId, search);
  }

  @Get('units/:unitId/records')
  @RequirePermission(Permissions.canViewAttendance)
  @ApiOperation({
    summary: 'Attendance records for a unit (optional date filter)',
  })
  @ApiOkResponse({ description: 'List of attendance entries' })
  async records(
    @Param('unitId', ParseIntPipe) unitId: number,
    @Query('sessionDate') sessionDate?: string,
  ) {
    const items = await this.attendanceService.listForSession(
      unitId,
      sessionDate,
    );
    return plainToInstance(AttendanceEntryDto, items, {
      excludeExtraneousValues: true,
    });
  }

  @Post('mark')
  @RequirePermission(Permissions.canMarkAttendance)
  @ApiOperation({ summary: 'Bulk mark attendance for a class session' })
  @ApiCreatedResponse({ description: 'Count of attendance records marked' })
  async mark(
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.attendanceService.mark(dto, actor.userId);
  }
}
