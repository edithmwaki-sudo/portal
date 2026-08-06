import { Module } from '@nestjs/common';
import { FeeStructuresService } from './fee-structures.service';
import { CourseFeeAssignmentsService } from './course-fee-assignments.service';
import { FeeStructuresController } from './fee-structures.controller';
import { CourseFeeAssignmentsController } from './course-fee-assignments.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [FeeStructuresService, CourseFeeAssignmentsService],
  controllers: [FeeStructuresController, CourseFeeAssignmentsController],
  exports: [FeeStructuresService, CourseFeeAssignmentsService],
})
export class FeesModule {}
