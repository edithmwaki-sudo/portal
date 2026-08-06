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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission(Permissions.canViewStaff)
  @ApiOperation({ summary: 'List users (paginated, optional search)' })
  @ApiOkResponse({ description: 'Paginated user list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: 'staff' | 'student',
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    const result = await this.usersService.list(
      parsedPage,
      parsedLimit,
      search,
      type,
    );

    return {
      items: plainToInstance(UserResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewStaff)
  @ApiOperation({ summary: 'Get a single user' })
  @ApiOkResponse({ type: UserResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOneById(id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canCreateStaff)
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ type: UserResponseDto })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const user = await this.usersService.create(dto, actor.userId);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canUpdateStaff)
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const user = await this.usersService.update(id, dto, actor.userId);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canDeleteStaff)
  @ApiOperation({ summary: 'Soft-delete a user' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.usersService.remove(id, actor.userId);
  }

  @Post(':id/reset-password')
  @RequirePermission(Permissions.canUpdateStaff)
  @ApiOperation({
    summary: 'Admin-reset a user password (forces reset on next login)',
  })
  @ApiOkResponse({ type: UserResponseDto })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const user = await this.usersService.resetPassword(id, dto, actor.userId);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
