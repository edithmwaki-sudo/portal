import { Module } from '@nestjs/common';
import { TimetablesService } from './timetables.service';
import { TimetablesController } from './timetables.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [TimetablesService],
  controllers: [TimetablesController],
  exports: [TimetablesService],
})
export class TimetablesModule {}
