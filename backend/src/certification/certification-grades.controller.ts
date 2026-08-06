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
import { CertificationGradesService } from './certification-grades.service';
import { CreateCertificationGradeDto } from './dto/create-certification-grade.dto';
import { UpdateCertificationGradeDto } from './dto/update-certification-grade.dto';
import { CertificationGradeResponseDto } from './dto/certification-grade-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('certification-authority-grades')
@ApiBearerAuth('access-token')
@Controller('certification-authorities/:certificationAuthorityId/grades')
export class CertificationGradesController {
  constructor(private readonly gradesService: CertificationGradesService) {}

  @Get()
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({
    summary: 'List grades for an authority (paginated, optional search)',
  })
  @ApiOkResponse({ description: 'Paginated certification grade list' })
  async findAll(
    @Param('certificationAuthorityId', ParseIntPipe)
    certificationAuthorityId: number,
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
    const result = await this.gradesService.findAllByAuthority(
      certificationAuthorityId,
      {
        page: parsedPage,
        limit: parsedLimit,
        search,
        status,
        sortBy,
        sortDirection,
      },
    );

    return {
      items: plainToInstance(CertificationGradeResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Get a single certification grade' })
  @ApiOkResponse({ type: CertificationGradeResponseDto })
  async findOne(
    @Param('certificationAuthorityId', ParseIntPipe)
    certificationAuthorityId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const grade = await this.gradesService.findOneById(
      certificationAuthorityId,
      id,
    );
    return plainToInstance(CertificationGradeResponseDto, grade, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Create a certification grade' })
  @ApiCreatedResponse({ type: CertificationGradeResponseDto })
  async create(
    @Param('certificationAuthorityId', ParseIntPipe)
    certificationAuthorityId: number,
    @Body() dto: CreateCertificationGradeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const grade = await this.gradesService.create(
      certificationAuthorityId,
      dto,
      actor.userId,
    );
    return plainToInstance(CertificationGradeResponseDto, grade, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Update a certification grade' })
  @ApiOkResponse({ type: CertificationGradeResponseDto })
  async update(
    @Param('certificationAuthorityId', ParseIntPipe)
    certificationAuthorityId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCertificationGradeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const grade = await this.gradesService.update(
      certificationAuthorityId,
      id,
      dto,
      actor.userId,
    );
    return plainToInstance(CertificationGradeResponseDto, grade, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permissions.canManageCertification)
  @ApiOperation({ summary: 'Delete a certification grade' })
  async remove(
    @Param('certificationAuthorityId', ParseIntPipe)
    certificationAuthorityId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.gradesService.remove(certificationAuthorityId, id, actor.userId);
  }
}
