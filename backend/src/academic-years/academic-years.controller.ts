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
import { AcademicYearsService } from './academic-years.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { AcademicYearResponseDto } from './dto/academic-year-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('academic-years')
@ApiBearerAuth('access-token')
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly yearsService: AcademicYearsService) {}

  @Get()
  @RequirePermission(Permissions.canViewAcademicYear)
  @ApiOperation({ summary: 'List academic years (paginated, optional search)' })
  @ApiOkResponse({ description: 'Paginated academic year list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    const result = await this.yearsService.findAll({
      page: parsedPage,
      limit: parsedLimit,
      search,
    });

    return {
      items: plainToInstance(AcademicYearResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewAcademicYear)
  @ApiOperation({ summary: 'Get a single academic year' })
  @ApiOkResponse({ type: AcademicYearResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const year = await this.yearsService.findOneById(id);
    return plainToInstance(AcademicYearResponseDto, year, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canAddAcademicYear)
  @ApiOperation({ summary: 'Create an academic year (auto-creates sessions)' })
  @ApiCreatedResponse({ type: AcademicYearResponseDto })
  async create(
    @Body() dto: CreateAcademicYearDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const year = await this.yearsService.create(dto, actor.userId);
    return plainToInstance(AcademicYearResponseDto, year, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canEditAcademicYear)
  @ApiOperation({ summary: 'Update an academic year' })
  @ApiOkResponse({ type: AcademicYearResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcademicYearDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const year = await this.yearsService.update(id, dto, actor.userId);
    return plainToInstance(AcademicYearResponseDto, year, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canDeleteAcademicYear)
  @ApiOperation({ summary: 'Delete an academic year and its sessions' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.yearsService.remove(id, actor.userId);
  }
}
