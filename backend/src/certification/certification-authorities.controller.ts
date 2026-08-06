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
import { CertificationAuthoritiesService } from './certification-authorities.service';
import { CreateCertificationAuthorityDto } from './dto/create-certification-authority.dto';
import { UpdateCertificationAuthorityDto } from './dto/update-certification-authority.dto';
import { CertificationAuthorityResponseDto } from './dto/certification-authority-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('certification-authorities')
@ApiBearerAuth('access-token')
@Controller('certification-authorities')
export class CertificationAuthoritiesController {
  constructor(
    private readonly authoritiesService: CertificationAuthoritiesService,
  ) {}

  @Get()
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({
    summary: 'List certification authorities (paginated, optional search)',
  })
  @ApiOkResponse({ description: 'Paginated certification authority list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
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
    const result = await this.authoritiesService.findAll({
      page: parsedPage,
      limit: parsedLimit,
      search,
      status,
      sortBy,
      sortDirection,
    });

    return {
      items: plainToInstance(
        CertificationAuthorityResponseDto,
        result.items,
        { excludeExtraneousValues: true },
      ),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get('meta')
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Search active authority options for pickers' })
  @ApiOkResponse({ description: 'Certification authority options' })
  async meta(@Query('search') search?: string, @Query('limit') limit?: string) {
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '10', 10) || 10, 1),
      50,
    );
    const options = await this.authoritiesService.listOptions(
      search,
      parsedLimit,
    );
    return { options };
  }

  @Get(':id')
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Get a single certification authority' })
  @ApiOkResponse({ type: CertificationAuthorityResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const authority = await this.authoritiesService.findOneById(id);
    return plainToInstance(CertificationAuthorityResponseDto, authority, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Create a certification authority' })
  @ApiCreatedResponse({ type: CertificationAuthorityResponseDto })
  async create(
    @Body() dto: CreateCertificationAuthorityDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const authority = await this.authoritiesService.create(
      dto,
      actor.userId,
    );
    return plainToInstance(CertificationAuthorityResponseDto, authority, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Update a certification authority' })
  @ApiOkResponse({ type: CertificationAuthorityResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCertificationAuthorityDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const authority = await this.authoritiesService.update(
      id,
      dto,
      actor.userId,
    );
    return plainToInstance(CertificationAuthorityResponseDto, authority, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Delete a certification authority' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.authoritiesService.remove(id, actor.userId);
  }
}
