import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitResponseDto } from './dto/unit-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('units')
@ApiBearerAuth('access-token')
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  /**
   * Admin (unit.view) sees all units. HOD (unit.hodview) is always scoped to
   * the HOD's own department — any department param is ignored for scoping.
   */
  @Get()
  @RequirePermission(Permissions.canViewUnit, Permissions.canHodViewUnit)
  @ApiOperation({
    summary: 'List units (admin: all, HOD: own department only)',
  })
  @ApiOkResponse({ description: 'Paginated unit list' })
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('courseId') courseId?: string,
    @Query('curriculumId') curriculumId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDirection') sortDirection?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );

    const isAdminView = actor.permissions.includes(Permissions.canViewUnit);
    const departmentScopeId = isAdminView
      ? undefined
      : await this.unitsService.resolveHodDepartmentId(actor.userId);

    const result = await this.unitsService.findAll(
      {
        page: parsedPage,
        limit: parsedLimit,
        courseId: courseId ? parseInt(courseId, 10) : undefined,
        curriculumId: curriculumId ? parseInt(curriculumId, 10) : undefined,
        search,
        status,
        sortBy,
        sortDirection,
      },
      departmentScopeId,
    );

    return {
      items: plainToInstance(UnitResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  /**
   * Admins (unit.view) are never scoped. Non-admins are restricted to units
   * whose course belongs to the HOD's own assigned department.
   */
  private async assertCanAccessUnit(
    actor: AuthenticatedUser,
    id: number,
    unit: { courseId: number },
  ): Promise<void> {
    if (actor.permissions.includes(Permissions.canViewUnit)) {
      return;
    }
    const hodDepartmentId = await this.unitsService.resolveHodDepartmentId(
      actor.userId,
    );
    if (hodDepartmentId === null || hodDepartmentId === undefined) {
      throw new NotFoundException(`Unit with id '${id}' not found`);
    }
    const departmentId = await this.unitsService.getCourseDepartmentId(
      unit.courseId,
    );
    if (departmentId !== hodDepartmentId) {
      throw new NotFoundException(`Unit with id '${id}' not found`);
    }
  }

  /**
   * Keeps create scoped for non-admin (HOD) actors: the target course must
   * belong to the actor's own department.
   */
  private async assertCanAssignCourse(
    actor: AuthenticatedUser,
    courseId: number,
  ): Promise<void> {
    if (actor.permissions.includes(Permissions.canViewUnit)) {
      return;
    }
    const hodDepartmentId = await this.unitsService.resolveHodDepartmentId(
      actor.userId,
    );
    const departmentId =
      await this.unitsService.getCourseDepartmentId(courseId);
    if (
      hodDepartmentId === null ||
      hodDepartmentId === undefined ||
      departmentId !== hodDepartmentId
    ) {
      throw new NotFoundException('Cannot assign units to this course');
    }
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewUnit, Permissions.canHodViewUnit)
  @ApiOperation({ summary: 'Get a single unit' })
  @ApiOkResponse({ type: UnitResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const unit = await this.unitsService.findOneById(id);
    await this.assertCanAccessUnit(actor, id, unit);
    return plainToInstance(UnitResponseDto, unit, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canAddUnit)
  @ApiOperation({
    summary: 'Create a unit assigned to a course and curriculum',
  })
  @ApiCreatedResponse({ type: UnitResponseDto })
  async create(
    @Body() dto: CreateUnitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.assertCanAssignCourse(actor, dto.courseId);
    const unit = await this.unitsService.create(dto, actor.userId);
    return plainToInstance(UnitResponseDto, unit, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canEditUnit)
  @ApiOperation({ summary: 'Update a unit' })
  @ApiOkResponse({ type: UnitResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const existing = await this.unitsService.findOneById(id);
    await this.assertCanAccessUnit(actor, id, existing);
    const unit = await this.unitsService.update(id, dto, actor.userId);
    return plainToInstance(UnitResponseDto, unit, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canEditUnit)
  @ApiOperation({ summary: 'Delete a unit' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    const existing = await this.unitsService.findOneById(id);
    await this.assertCanAccessUnit(actor, id, existing);
    await this.unitsService.remove(id, actor.userId);
  }
}
