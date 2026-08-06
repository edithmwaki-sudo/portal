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
import { CourseFeeAssignmentsService } from './course-fee-assignments.service';
import { CreateCourseFeeAssignmentDto } from './dto/create-course-fee-assignment.dto';
import { UpdateCourseFeeAssignmentDto } from './dto/update-course-fee-assignment.dto';
import { CourseFeeAssignmentResponseDto } from './dto/course-fee-assignment-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('course-fee-assignments')
@ApiBearerAuth('access-token')
@Controller('course-fee-assignments')
export class CourseFeeAssignmentsController {
  constructor(
    private readonly assignmentsService: CourseFeeAssignmentsService,
  ) {}

  @Get()
  @RequirePermission(Permissions.canViewFeeAssignment)
  @ApiOperation({
    summary: 'List course fee assignments (paginated, optional filters)',
  })
  @ApiOkResponse({ description: 'Paginated course fee assignment list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('courseId') courseId?: string,
    @Query('curriculumId') curriculumId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    const result = await this.assignmentsService.findAll({
      page: parsedPage,
      limit: parsedLimit,
      search,
      status,
      courseId: courseId ? parseInt(courseId, 10) : undefined,
      curriculumId: curriculumId ? parseInt(curriculumId, 10) : undefined,
      academicYearId: academicYearId ? parseInt(academicYearId, 10) : undefined,
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
    });

    return {
      items: plainToInstance(CourseFeeAssignmentResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewFeeAssignment)
  @ApiOperation({ summary: 'Get a single course fee assignment' })
  @ApiOkResponse({ type: CourseFeeAssignmentResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const assignment = await this.assignmentsService.findOneById(id);
    return plainToInstance(CourseFeeAssignmentResponseDto, assignment, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManageFeeAssignment)
  @ApiOperation({ summary: 'Assign a fee structure to an academic context' })
  @ApiCreatedResponse({ type: CourseFeeAssignmentResponseDto })
  async create(
    @Body() dto: CreateCourseFeeAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const assignment = await this.assignmentsService.create(dto, actor.userId);
    return plainToInstance(CourseFeeAssignmentResponseDto, assignment, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canManageFeeAssignment)
  @ApiOperation({ summary: 'Update a course fee assignment' })
  @ApiOkResponse({ type: CourseFeeAssignmentResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseFeeAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const assignment = await this.assignmentsService.update(
      id,
      dto,
      actor.userId,
    );
    return plainToInstance(CourseFeeAssignmentResponseDto, assignment, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canManageFeeAssignment)
  @ApiOperation({ summary: 'Soft-delete a course fee assignment' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.assignmentsService.remove(id, actor.userId);
  }
}
