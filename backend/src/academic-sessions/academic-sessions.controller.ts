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
import { AcademicSessionsService } from './academic-sessions.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import { AcademicSessionResponseDto } from './dto/academic-session-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('academic-sessions')
@ApiBearerAuth('access-token')
@Controller('academic-sessions')
export class AcademicSessionsController {
  constructor(private readonly sessionsService: AcademicSessionsService) {}

  @Get()
  @RequirePermission(Permissions.canViewAcademicSession)
  @ApiOperation({ summary: 'List academic sessions (filter by year)' })
  @ApiOkResponse({ description: 'Paginated session list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('search') search?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    const result = await this.sessionsService.findAll({
      page: parsedPage,
      limit: parsedLimit,
      academicYearId: academicYearId ? parseInt(academicYearId, 10) : undefined,
      search,
    });

    return {
      items: plainToInstance(AcademicSessionResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewAcademicSession)
  @ApiOperation({ summary: 'Get a single academic session' })
  @ApiOkResponse({ type: AcademicSessionResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const session = await this.sessionsService.findOneById(id);
    return plainToInstance(AcademicSessionResponseDto, session, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canAddAcademicSession)
  @ApiOperation({ summary: 'Create an academic session' })
  @ApiCreatedResponse({ type: AcademicSessionResponseDto })
  async create(
    @Body() dto: CreateAcademicSessionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const session = await this.sessionsService.create(dto, actor.userId);
    return plainToInstance(AcademicSessionResponseDto, session, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canEditAcademicSession)
  @ApiOperation({ summary: 'Update an academic session' })
  @ApiOkResponse({ type: AcademicSessionResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcademicSessionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const session = await this.sessionsService.update(id, dto, actor.userId);
    return plainToInstance(AcademicSessionResponseDto, session, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canDeleteAcademicSession)
  @ApiOperation({ summary: 'Delete an academic session' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.sessionsService.remove(id, actor.userId);
  }
}
