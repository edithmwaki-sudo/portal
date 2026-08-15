import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateAdhocInvoiceDto } from './dto/create-adhoc-invoice.dto';
import { ReverseInvoiceDto } from './dto/reverse-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('invoices')
@ApiBearerAuth('access-token')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission(Permissions.canViewInvoice)
  @ApiOperation({ summary: 'List invoices (paginated, filterable)' })
  @ApiOkResponse({ description: 'Paginated invoice list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('academicSessionId') academicSessionId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    const result = await this.invoicesService.findAll({
      page: parsedPage,
      limit: parsedLimit,
      search,
      studentId: studentId ? parseInt(studentId, 10) : undefined,
      status,
      type,
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
      academicYearId: academicYearId ? parseInt(academicYearId, 10) : undefined,
    });

    return {
      items: plainToInstance(InvoiceResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get('meta/preview')
  @RequirePermission(Permissions.canViewInvoice)
  @ApiOperation({
    summary: 'Preview a template invoice for a student before issuing',
  })
  @ApiOkResponse({ description: 'Invoice preview' })
  async preview(
    @Query('studentId') studentId: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    const id = parseInt(studentId, 10);
    if (Number.isNaN(id)) {
      return { error: 'studentId is required' };
    }
    return this.invoicesService.preview({
      studentId: id,
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
    });
  }

  @Get('statement/:studentId')
  @RequirePermission(Permissions.canViewInvoice)
  @ApiOperation({ summary: 'Student fee statement from the ledger' })
  @ApiOkResponse({ description: 'Ledger statement with totals' })
  async statement(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    return this.invoicesService.statement(
      studentId,
      academicSessionId ? parseInt(academicSessionId, 10) : undefined,
    );
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewInvoice)
  @ApiOperation({ summary: 'Get a single invoice with its line items' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.invoicesService.findOneById(id);
    return plainToInstance(InvoiceResponseDto, invoice, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManageInvoice)
  @ApiOperation({ summary: 'Issue an invoice from the student fee template' })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const invoice = await this.invoicesService.createFromTemplate(
      dto,
      actor.userId,
    );
    return plainToInstance(InvoiceResponseDto, invoice, {
      excludeExtraneousValues: true,
    });
  }

  @Post('adhoc')
  @RequirePermission(Permissions.canManageInvoice)
  @ApiOperation({ summary: 'Issue an ad-hoc invoice (fines, other charges)' })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  async createAdhoc(
    @Body() dto: CreateAdhocInvoiceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const invoice = await this.invoicesService.createAdhoc(dto, actor.userId);
    return plainToInstance(InvoiceResponseDto, invoice, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/reverse')
  @RequirePermission(Permissions.canManageInvoice)
  @ApiOperation({ summary: 'Reverse (cancel) an issued invoice' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  async reverse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReverseInvoiceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const invoice = await this.invoicesService.reverse(id, dto, actor.userId);
    return plainToInstance(InvoiceResponseDto, invoice, {
      excludeExtraneousValues: true,
    });
  }
}
