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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CertificationLevelsService } from './certification-levels.service';
import { CreateCertificationLevelDto } from './dto/create-certification-level.dto';
import { UpdateCertificationLevelDto } from './dto/update-certification-level.dto';
import { CertificationLevelResponseDto } from './dto/certification-level-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('certification-levels')
@ApiBearerAuth('access-token')
@Controller('certification-levels')
export class CertificationLevelsController {
  constructor(private readonly levelsService: CertificationLevelsService) {}

  @Get()
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({
    summary: 'List certification levels (paginated, optional search)',
  })
  @ApiOkResponse({ description: 'Paginated certification level list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('certificationAuthorityId') certificationAuthorityId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDirection') sortDirection?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    const parsedAuthorityId = certificationAuthorityId
      ? parseInt(certificationAuthorityId, 10)
      : undefined;
    const result = await this.levelsService.findAll({
      page: parsedPage,
      limit: parsedLimit,
      search,
      status,
      certificationAuthorityId: parsedAuthorityId,
      sortBy,
      sortDirection,
    });

    return {
      items: plainToInstance(CertificationLevelResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Get a single certification level' })
  @ApiOkResponse({ type: CertificationLevelResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const level = await this.levelsService.findOneById(id);
    return plainToInstance(CertificationLevelResponseDto, level, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Create a certification level' })
  @ApiCreatedResponse({ type: CertificationLevelResponseDto })
  async create(
    @Body() dto: CreateCertificationLevelDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const level = await this.levelsService.create(dto, actor.userId);
    return plainToInstance(CertificationLevelResponseDto, level, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Update a certification level' })
  @ApiOkResponse({ type: CertificationLevelResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCertificationLevelDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const level = await this.levelsService.update(id, dto, actor.userId);
    return plainToInstance(CertificationLevelResponseDto, level, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Delete a certification level' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.levelsService.remove(id, actor.userId);
  }
}
