import { Module } from '@nestjs/common';
import { FeeStructuresService } from './fee-structures.service';
import { CourseFeeAssignmentsService } from './course-fee-assignments.service';
import { FeeStatementsService } from './fee-statements.service';
import { FeeStructuresController } from './fee-structures.controller';
import { CourseFeeAssignmentsController } from './course-fee-assignments.controller';
import { FeeStatementsController } from './fee-statements.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [
    FeeStructuresService,
    CourseFeeAssignmentsService,
    FeeStatementsService,
  ],
  controllers: [
    FeeStructuresController,
    CourseFeeAssignmentsController,
    FeeStatementsController,
  ],
  exports: [FeeStructuresService, CourseFeeAssignmentsService],
})
export class FeesModule {}
