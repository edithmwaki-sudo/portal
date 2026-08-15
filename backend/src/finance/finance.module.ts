import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';
import { InvoicesController } from './invoices.controller';
import { PaymentsController } from './payments.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [InvoicesService, PaymentsService],
  controllers: [InvoicesController, PaymentsController],
  exports: [InvoicesService, PaymentsService],
})
export class FinanceModule {}
