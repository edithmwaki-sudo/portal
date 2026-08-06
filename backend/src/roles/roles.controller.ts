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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { PermissionResponseDto } from '../permissions/dto/permission-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('roles')
@ApiBearerAuth('access-token')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'List roles (paginated, optional search)' })
  @ApiOkResponse({ description: 'Paginated role list' })
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

    const result = await this.rolesService.findAll(
      parsedPage,
      parsedLimit,
      search,
    );

    return {
      items: plainToInstance(RoleResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'Get a single role with its permissions' })
  @ApiOkResponse({ type: RoleResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const role = await this.rolesService.findOneById(id);
    return plainToInstance(RoleResponseDto, role, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'Create a role' })
  @ApiCreatedResponse({ type: RoleResponseDto })
  async create(@Body() dto: CreateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    const role = await this.rolesService.create(dto, actor.userId);
    return plainToInstance(RoleResponseDto, role, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'Update a role' })
  @ApiOkResponse({ type: RoleResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const role = await this.rolesService.update(id, dto, actor.userId);
    return plainToInstance(RoleResponseDto, role, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'Delete a role' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.rolesService.remove(id, actor.userId);
  }

  @Post(':id/permissions/:permissionName')
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'Attach a permission to a role' })
  @ApiOkResponse({ type: RoleResponseDto })
  async attachPermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionName') permissionName: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const role = await this.rolesService.attachPermission(id, permissionName, actor.userId);
    return plainToInstance(RoleResponseDto, role, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id/permissions/:permissionName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'Detach a permission from a role' })
  async detachPermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionName') permissionName: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.rolesService.detachPermission(id, permissionName, actor.userId);
  }

  @Get(':id/permissions')
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'List the permissions attached to a role' })
  @ApiOkResponse({ type: PermissionResponseDto, isArray: true })
  async listPermissions(@Param('id', ParseIntPipe) id: number) {
    const result = await this.rolesService.listPermissions(id);
    return plainToInstance(PermissionResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }
}
