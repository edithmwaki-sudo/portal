import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { PermissionsService } from './permissions.service';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { RequirePermission } from './decorators/require-permission.decorator';
import { Permissions } from './permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('permissions')
@ApiBearerAuth('access-token')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'List permissions (paginated)' })
  @ApiOkResponse({ description: 'Paginated permission list' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );

    const result = await this.permissionsService.findAll(
      parsedPage,
      parsedLimit,
    );

    return {
      items: plainToInstance(PermissionResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Post('sync')
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'Resync the permission catalog from app constants' })
  @ApiOkResponse({ description: 'Full permission catalog after sync' })
  async sync(@CurrentUser() actor: AuthenticatedUser) {
    const result = await this.permissionsService.sync(actor.userId);
    return {
      items: plainToInstance(PermissionResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':name')
  @RequirePermission(Permissions.canManagePermissions)
  @ApiOperation({ summary: 'Get a single permission by name' })
  @ApiOkResponse({ type: PermissionResponseDto })
  async findOne(@Param('name') name: string) {
    const permission = await this.permissionsService.findOneByName(name);
    return plainToInstance(PermissionResponseDto, permission, {
      excludeExtraneousValues: true,
    });
  }
}
