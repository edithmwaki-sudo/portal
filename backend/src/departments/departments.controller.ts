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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('departments')
@ApiBearerAuth('access-token')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermission(Permissions.canManageDepartment)
  @ApiOperation({ summary: 'List departments (paginated, optional search)' })
  @ApiOkResponse({ description: 'Paginated department list' })
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
    const result = await this.departmentsService.findAll(
      parsedPage,
      parsedLimit,
      search,
    );

    return {
      items: plainToInstance(DepartmentResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get('meta')
  @RequirePermission(Permissions.canManageDepartment)
  @ApiOperation({ summary: 'Search active staff options for the HOD picker' })
  @ApiOkResponse({ description: 'Head of department candidate options' })
  async meta(@Query('search') search?: string, @Query('limit') limit?: string) {
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '10', 10) || 10, 1),
      50,
    );
    const options = await this.departmentsService.listHeadOptions(
      search,
      parsedLimit,
    );
    return { headOfDepartmentOptions: options };
  }

  @Get(':id')
  @RequirePermission(Permissions.canManageDepartment)
  @ApiOperation({ summary: 'Get a single department' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const department = await this.departmentsService.findOneById(id);
    return plainToInstance(DepartmentResponseDto, department, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManageDepartment)
  @ApiOperation({ summary: 'Create a department' })
  @ApiCreatedResponse({ type: DepartmentResponseDto })
  async create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const department = await this.departmentsService.create(dto, actor.userId);
    return plainToInstance(DepartmentResponseDto, department, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canManageDepartment)
  @ApiOperation({ summary: 'Update a department' })
  @ApiOkResponse({ type: DepartmentResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const department = await this.departmentsService.update(
      id,
      dto,
      actor.userId,
    );
    return plainToInstance(DepartmentResponseDto, department, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canManageDepartment)
  @ApiOperation({ summary: 'Soft-delete a department' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.departmentsService.remove(id, actor.userId);
  }
}
