import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { ReportsService } from './reports.service';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('finance/overview')
  @RequirePermission(Permissions.canViewFinanceReport)
  @ApiOperation({ summary: 'Finance overview totals for a year/session' })
  @ApiOkResponse({ description: 'Billed, collected, outstanding, credit, rate' })
  financeOverview(
    @Query('academicYearId') academicYearId?: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    return this.reportsService.financeOverview({
      academicYearId: academicYearId ? parseInt(academicYearId, 10) : undefined,
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
    });
  }

  @Get('finance/aging')
  @RequirePermission(Permissions.canViewFinanceReport)
  @ApiOperation({ summary: 'Outstanding balances by days past due' })
  @ApiOkResponse({ description: 'Current / 1-30 / 31-60 / 61-90 / 90+ buckets' })
  financeAging(@Query('academicSessionId') academicSessionId?: string) {
    return this.reportsService.financeAging({
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
    });
  }

  @Get('finance/collections')
  @RequirePermission(Permissions.canViewFinanceReport)
  @ApiOperation({ summary: 'Daily collection totals, optionally by method' })
  @ApiOkResponse({ description: 'Daily payment aggregation' })
  financeCollections(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('method') method?: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    return this.reportsService.financeCollections({
      from,
      to,
      method: (method as PaymentMethod) || undefined,
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
    });
  }

  @Get('finance/defaulters')
  @RequirePermission(Permissions.canViewFinanceReport)
  @ApiOperation({ summary: 'Students with outstanding balances, most-indebted first' })
  @ApiOkResponse({ description: 'Paginated defaulter list' })
  financeDefaulters(
    @Query('academicSessionId') academicSessionId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    return this.reportsService.financeDefaulters({
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  @Get('finance/course-summary')
  @RequirePermission(Permissions.canViewFinanceReport)
  @ApiOperation({ summary: 'Billed/collected/outstanding per course' })
  @ApiOkResponse({ description: 'Per-course finance summary' })
  financeCourseSummary(
    @Query('academicYearId') academicYearId?: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    return this.reportsService.financeCourseSummary({
      academicYearId: academicYearId ? parseInt(academicYearId, 10) : undefined,
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
    });
  }

  @Get('finance/credit-balances')
  @RequirePermission(Permissions.canViewFinanceReport)
  @ApiOperation({ summary: 'Students with credit on account' })
  @ApiOkResponse({ description: 'Credit balance list' })
  financeCreditBalances(
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    return this.reportsService.financeCreditBalances({
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
    });
  }

  @Get('finance/reversals')
  @RequirePermission(Permissions.canViewFinanceReport)
  @ApiOperation({ summary: 'Reversal register (payments + invoices)' })
  @ApiOkResponse({ description: 'Reversed payments and cancelled invoices' })
  financeReversals(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.financeReversals({ from, to });
  }
}
