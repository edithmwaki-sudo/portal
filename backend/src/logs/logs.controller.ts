import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';

@ApiTags('logs')
@ApiBearerAuth('access-token')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @RequirePermission(Permissions.canViewAppLogs)
  @ApiOperation({
    summary: 'List application log entries (paginated, optional search)',
  })
  @ApiOkResponse({ description: 'Paginated app log entries' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      200,
    );

    return this.logsService.findAll(parsedPage, parsedLimit, search);
  }
}
