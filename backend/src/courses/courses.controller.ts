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
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseResponseDto } from './dto/course-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

const COURSE_FORM_PERMISSIONS = [
  Permissions.canViewCourse,
  Permissions.canHodViewCourse,
  Permissions.canAddCourse,
  Permissions.canEditCourse,
] as const;

@ApiTags('courses')
@ApiBearerAuth('access-token')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * Single list endpoint used by both views. Admin (course.view) sees all
   * courses; HOD (course.hodview) is always scoped to the HOD's own assigned
   * department — any `deptid` query param is ignored for scoping.
   */
  @Get()
  @RequirePermission(Permissions.canViewCourse, Permissions.canHodViewCourse)
  @ApiOperation({
    summary: 'List courses (admin: all, HOD: own department only)',
  })
  @ApiOkResponse({ description: 'Paginated course list' })
  async findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('certificationAuthorityId') certificationAuthorityId?: string,
    @Query('certificationLevelId') certificationLevelId?: string,
    @Query('curriculumId') curriculumId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDirection') sortDirection?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );

    const isAdminView = actor.permissions.includes(Permissions.canViewCourse);
    const departmentScopeId = isAdminView
      ? undefined
      : await this.coursesService.resolveHodDepartmentId(actor.userId);

    const result = await this.coursesService.findAll(
      {
        page: parsedPage,
        limit: parsedLimit,
        search,
        status,
        certificationAuthorityId: certificationAuthorityId
          ? parseInt(certificationAuthorityId, 10)
          : undefined,
        certificationLevelId: certificationLevelId
          ? parseInt(certificationLevelId, 10)
          : undefined,
        curriculumId: curriculumId ? parseInt(curriculumId, 10) : undefined,
        sortBy,
        sortDirection,
      },
      departmentScopeId,
    );

    return {
      items: plainToInstance(CourseResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get('meta/authorities')
  @RequirePermission(...COURSE_FORM_PERMISSIONS)
  @ApiOperation({
    summary: 'Active certification authority options for the course form',
  })
  async metaAuthorities(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      options: await this.coursesService.listAuthorityOptions(
        search,
        limit ? parseInt(limit, 10) : undefined,
      ),
    };
  }

  @Get('meta/levels')
  @RequirePermission(...COURSE_FORM_PERMISSIONS)
  @ApiOperation({ summary: 'Active level options for an authority (cascade)' })
  async metaLevels(
    @Query('authorityId') authorityId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = parseInt(authorityId, 10);
    if (Number.isNaN(parsed)) {
      return { options: [] };
    }
    return {
      options: await this.coursesService.listLevelOptions(
        parsed,
        search,
        limit ? parseInt(limit, 10) : undefined,
      ),
    };
  }

  @Get('meta/curricula')
  @RequirePermission(...COURSE_FORM_PERMISSIONS)
  @ApiOperation({
    summary: 'Active curriculum options for an authority (cascade)',
  })
  async metaCurricula(
    @Query('authorityId') authorityId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = parseInt(authorityId, 10);
    if (Number.isNaN(parsed)) {
      return { options: [] };
    }
    return {
      options: await this.coursesService.listCurriculumOptions(
        parsed,
        search,
        limit ? parseInt(limit, 10) : undefined,
      ),
    };
  }

  @Get('meta/departments')
  @RequirePermission(...COURSE_FORM_PERMISSIONS)
  @ApiOperation({ summary: 'Active department options for the course form' })
  async metaDepartments(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      options: await this.coursesService.listDepartmentOptions(
        search,
        limit ? parseInt(limit, 10) : undefined,
      ),
    };
  }

  @Get('meta/my-department')
  @RequirePermission(Permissions.canHodViewCourse)
  @ApiOperation({ summary: "The HOD's own department (id + name) for context" })
  async metaMyDepartment(@CurrentUser() actor: AuthenticatedUser) {
    return {
      department: await this.coursesService.getMyDepartment(actor.userId),
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewCourse, Permissions.canHodViewCourse)
  @ApiOperation({ summary: 'Get a single course' })
  @ApiOkResponse({ type: CourseResponseDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const course = await this.coursesService.findOneById(id);
    await this.assertCanAccessCourse(actor, id, course);

    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Admins (course.view) are never scoped. Non-admins are restricted to their
   * own assigned department, resolved server-side from the token user - never
   * from URL params. Applies to read AND write (update/delete) access.
   */
  private async assertCanAccessCourse(
    actor: AuthenticatedUser,
    id: number,
    course: { departmentId: number | null },
  ): Promise<void> {
    if (actor.permissions.includes(Permissions.canViewCourse)) {
      return;
    }
    const hodDepartmentId = await this.coursesService.resolveHodDepartmentId(
      actor.userId,
    );
    if (course.departmentId !== hodDepartmentId) {
      throw new NotFoundException(`Course with id '${id}' not found`);
    }
  }

  @Post()
  @RequirePermission(Permissions.canAddCourse)
  @ApiOperation({
    summary: 'Create a course (optionally linking its first curriculum)',
  })
  @ApiCreatedResponse({ type: CourseResponseDto })
  async create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const course = await this.coursesService.create(dto, actor.userId);
    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canEditCourse)
  @ApiOperation({ summary: 'Update a course' })
  @ApiOkResponse({ type: CourseResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const existing = await this.coursesService.findOneById(id);
    await this.assertCanAccessCourse(actor, id, existing);
    const course = await this.coursesService.update(id, dto, actor.userId);
    return plainToInstance(CourseResponseDto, course, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canEditCourse)
  @ApiOperation({ summary: 'Delete a course (soft)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    const existing = await this.coursesService.findOneById(id);
    await this.assertCanAccessCourse(actor, id, existing);
    await this.coursesService.remove(id, actor.userId);
  }
}
