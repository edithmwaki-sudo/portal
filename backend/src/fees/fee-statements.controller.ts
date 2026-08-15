import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeeStatementsService } from './fee-statements.service';
import {
  FeeStatementDetailQueryDto,
  FeeStatementListQueryDto,
} from './dto/fee-statement-query.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';

@ApiTags('fees/statements')
@ApiBearerAuth('access-token')
@Controller('fees/statements')
export class FeeStatementsController {
  constructor(private readonly feeStatementsService: FeeStatementsService) {}

  @Get()
  @RequirePermission(Permissions.canViewFeeStatement)
  @ApiOperation({ summary: 'List student fee statements (all students)' })
  @ApiOkResponse({ description: 'Paginated student balances' })
  async list(@Query() query: FeeStatementListQueryDto) {
    return this.feeStatementsService.list({
      scope: query.scope,
      academicYearId: query.academicYearId,
      academicSessionId: query.academicSessionId,
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 25,
    });
  }

  @Get(':studentId/pdf')
  @RequirePermission(Permissions.canViewFeeStatement)
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Download a fee statement as a PDF' })
  @ApiOkResponse({ description: 'PDF document' })
  async pdf(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query() query: FeeStatementDetailQueryDto,
  ) {
    const buffer = await this.feeStatementsService.generatePdf(studentId, {
      scope: query.scope,
      academicYearId: query.academicYearId,
      academicSessionId: query.academicSessionId,
    });
    return buffer;
  }

  @Get(':studentId')
  @RequirePermission(Permissions.canViewFeeStatement)
  @ApiOperation({ summary: 'Get a single student fee statement' })
  @ApiOkResponse({ description: 'Student fee statement' })
  async detail(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query() query: FeeStatementDetailQueryDto,
  ) {
    return this.feeStatementsService.statementDetail(studentId, {
      scope: query.scope,
      academicYearId: query.academicYearId,
      academicSessionId: query.academicSessionId,
    });
  }
}
