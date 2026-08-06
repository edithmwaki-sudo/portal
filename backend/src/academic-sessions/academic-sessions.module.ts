import { Module } from '@nestjs/common';
import { AcademicSessionsService } from './academic-sessions.service';
import { AcademicSessionsController } from './academic-sessions.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [AcademicSessionsService],
  controllers: [AcademicSessionsController],
  exports: [AcademicSessionsService],
})
export class AcademicSessionsModule {}
