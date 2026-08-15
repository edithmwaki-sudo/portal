import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReversePaymentDto } from './dto/reverse-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permissions } from '../permissions/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @RequirePermission(Permissions.canViewPayment)
  @ApiOperation({ summary: 'List payments (paginated, filterable)' })
  @ApiOkResponse({ description: 'Paginated payment list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: string,
    @Query('method') method?: PaymentMethod,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    const parsedPage = Math.max(parseInt(page ?? '1', 10) || 1, 1);
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '25', 10) || 25, 1),
      100,
    );
    const result = await this.paymentsService.findAll({
      page: parsedPage,
      limit: parsedLimit,
      search,
      studentId: studentId ? parseInt(studentId, 10) : undefined,
      status,
      method: method as PaymentMethod | undefined,
      academicSessionId: academicSessionId
        ? parseInt(academicSessionId, 10)
        : undefined,
    });

    return {
      items: plainToInstance(PaymentResponseDto, result.items, {
        excludeExtraneousValues: true,
      }),
      total: result.total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @RequirePermission(Permissions.canViewPayment)
  @ApiOperation({ summary: 'Get a single payment with its allocations' })
  @ApiOkResponse({ type: PaymentResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const payment = await this.paymentsService.findOneById(id);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermission(Permissions.canManagePayment)
  @ApiOperation({ summary: 'Record a payment and allocate it to invoices' })
  @ApiCreatedResponse({ type: PaymentResponseDto })
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const payment = await this.paymentsService.create(dto, actor.userId);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Post(':id/reverse')
  @RequirePermission(Permissions.canManagePayment)
  @ApiOperation({ summary: 'Reverse a payment' })
  @ApiOkResponse({ type: PaymentResponseDto })
  async reverse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReversePaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const payment = await this.paymentsService.reverse(id, dto, actor.userId);
    return plainToInstance(PaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }
}
