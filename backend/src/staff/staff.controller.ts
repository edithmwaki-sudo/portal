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
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffResponseDto } from './dto/staff-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('staff')
@ApiBearerAuth('access-token')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermission(Permissions.canViewStaff)
  @ApiOperation({ summary: 'List staff (paginated, optional search)' })
  @ApiOkResponse({ description: 'Paginated staff list' })
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
    const result = await this.staffService.findAll(
      parsedPage,
      parsedLimit,
      search,
    );

    return {
      items: plainToInstance(StaffResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get('meta')
  @RequirePermission(Permissions.canCreateStaff)
  @ApiOperation({
    summary: 'Onboarding meta: next employee number, roles and departments',
  })
  async meta() {
    return this.staffService.meta();
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewStaff)
  @ApiOperation({ summary: 'Get a single staff member' })
  @ApiOkResponse({ type: StaffResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const staff = await this.staffService.findOneById(id);
    return plainToInstance(StaffResponseDto, staff, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canCreateStaff)
  @ApiOperation({
    summary: 'Onboard a staff member (creates user + staff profile)',
  })
  @ApiCreatedResponse({ type: StaffResponseDto })
  async create(
    @Body() dto: CreateStaffDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const staff = await this.staffService.create(dto, actor.userId);
    return plainToInstance(StaffResponseDto, staff, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canUpdateStaff)
  @ApiOperation({ summary: 'Update a staff member' })
  @ApiOkResponse({ type: StaffResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const staff = await this.staffService.update(id, dto, actor.userId);
    return plainToInstance(StaffResponseDto, staff, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canDeleteStaff)
  @ApiOperation({
    summary: 'Soft-delete a staff member and deactivate the user',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.staffService.remove(id, actor.userId);
  }
}
