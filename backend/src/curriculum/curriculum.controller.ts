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
import { CurriculumService } from './curriculum.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { CurriculumResponseDto } from './dto/curriculum-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('curriculum')
@ApiBearerAuth('access-token')
@Controller('curriculum')
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get()
  @RequirePermission(Permissions.canManageCurriculum)
  @ApiOperation({
    summary: 'List curricula (paginated, optional search)',
  })
  @ApiOkResponse({ description: 'Paginated curriculum list' })
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
    const result = await this.curriculumService.findAll({
      page: parsedPage,
      limit: parsedLimit,
      search,
      status,
      certificationAuthorityId: parsedAuthorityId,
      sortBy,
      sortDirection,
    });

    return {
      items: plainToInstance(CurriculumResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canManageCurriculum)
  @ApiOperation({ summary: 'Get a single curriculum' })
  @ApiOkResponse({ type: CurriculumResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const curriculum = await this.curriculumService.findOneById(id);
    return plainToInstance(CurriculumResponseDto, curriculum, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManageCurriculum)
  @ApiOperation({ summary: 'Create a curriculum' })
  @ApiCreatedResponse({ type: CurriculumResponseDto })
  async create(
    @Body() dto: CreateCurriculumDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const curriculum = await this.curriculumService.create(dto, actor.userId);
    return plainToInstance(CurriculumResponseDto, curriculum, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canManageCurriculum)
  @ApiOperation({ summary: 'Update a curriculum' })
  @ApiOkResponse({ type: CurriculumResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurriculumDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const curriculum = await this.curriculumService.update(id, dto, actor.userId);
    return plainToInstance(CurriculumResponseDto, curriculum, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/toggle-active')
  @RequirePermission(Permissions.canManageCurriculum)
  @ApiOperation({
    summary: 'Toggle a curriculum active state (server-side started/ended dates)',
  })
  @ApiOkResponse({ type: CurriculumResponseDto })
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const curriculum = await this.curriculumService.toggleActive(id, actor.userId);
    return plainToInstance(CurriculumResponseDto, curriculum, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canManageCurriculum)
  @ApiOperation({ summary: 'Delete a curriculum' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.curriculumService.remove(id, actor.userId);
  }
}
