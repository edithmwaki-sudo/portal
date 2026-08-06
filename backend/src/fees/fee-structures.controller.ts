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
import { FeeStructuresService } from './fee-structures.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { FeeStructureResponseDto } from './dto/fee-structure-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('fee-structures')
@ApiBearerAuth('access-token')
@Controller('fee-structures')
export class FeeStructuresController {
  constructor(private readonly feeStructuresService: FeeStructuresService) {}

  @Get()
  @RequirePermission(Permissions.canViewFeeStructure)
  @ApiOperation({
    summary: 'List fee structures (paginated, optional search and status)',
  })
  @ApiOkResponse({ description: 'Paginated fee structure list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    const result = await this.feeStructuresService.findAll(
      parsedPage,
      parsedLimit,
      search,
      status,
    );

    return {
      items: plainToInstance(FeeStructureResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get('meta')
  @RequirePermission(Permissions.canViewFeeStructure)
  @ApiOperation({ summary: 'Search active fee structure options for pickers' })
  @ApiOkResponse({ description: 'Fee structure options' })
  async meta(@Query('search') search?: string, @Query('limit') limit?: string) {
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '10', 10) || 10, 1),
      50,
    );
    const options = await this.feeStructuresService.listOptions(
      search,
      parsedLimit,
    );
    return { options };
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewFeeStructure)
  @ApiOperation({ summary: 'Get a single fee structure with its items' })
  @ApiOkResponse({ type: FeeStructureResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const structure = await this.feeStructuresService.findOneById(id);
    return plainToInstance(FeeStructureResponseDto, structure, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManageFeeStructure)
  @ApiOperation({ summary: 'Create a fee structure with its fee items' })
  @ApiCreatedResponse({ type: FeeStructureResponseDto })
  async create(
    @Body() dto: CreateFeeStructureDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const structure = await this.feeStructuresService.create(dto, actor.userId);
    return plainToInstance(FeeStructureResponseDto, structure, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canManageFeeStructure)
  @ApiOperation({
    summary: 'Update a fee structure (optionally replace items)',
  })
  @ApiOkResponse({ type: FeeStructureResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeeStructureDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const structure = await this.feeStructuresService.update(
      id,
      dto,
      actor.userId,
    );
    return plainToInstance(FeeStructureResponseDto, structure, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canManageFeeStructure)
  @ApiOperation({ summary: 'Soft-delete a fee structure' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.feeStructuresService.remove(id, actor.userId);
  }
}
