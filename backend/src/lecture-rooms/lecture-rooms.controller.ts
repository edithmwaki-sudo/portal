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
import { LectureRoomsService } from './lecture-rooms.service';
import { CreateLectureRoomDto } from './dto/create-lecture-room.dto';
import { UpdateLectureRoomDto } from './dto/update-lecture-room.dto';
import { LectureRoomResponseDto } from './dto/lecture-room-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('lecture-rooms')
@ApiBearerAuth('access-token')
@Controller('lecture-rooms')
export class LectureRoomsController {
  constructor(private readonly roomsService: LectureRoomsService) {}

  @Get()
  @RequirePermission(Permissions.canViewLectureRoom)
  @ApiOperation({ summary: 'List lecture rooms (paginated, optional search)' })
  @ApiOkResponse({ description: 'Paginated room list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('all') all?: string,
  ) {
    const result = await this.roomsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      status,
      all: all === 'true',
    });

    return {
      items: plainToInstance(LectureRoomResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewLectureRoom)
  @ApiOperation({ summary: 'Get a single lecture room' })
  @ApiOkResponse({ type: LectureRoomResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomsService.findOneById(id);
    return plainToInstance(LectureRoomResponseDto, room, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canAddLectureRoom)
  @ApiOperation({ summary: 'Create a lecture room' })
  @ApiCreatedResponse({ type: LectureRoomResponseDto })
  async create(
    @Body() dto: CreateLectureRoomDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const room = await this.roomsService.create(dto, actor.userId);
    return plainToInstance(LectureRoomResponseDto, room, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canEditLectureRoom)
  @ApiOperation({ summary: 'Update a lecture room' })
  @ApiOkResponse({ type: LectureRoomResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLectureRoomDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const room = await this.roomsService.update(id, dto, actor.userId);
    return plainToInstance(LectureRoomResponseDto, room, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canDeleteLectureRoom)
  @ApiOperation({ summary: 'Soft-delete a lecture room' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.roomsService.remove(id, actor.userId);
  }
}
