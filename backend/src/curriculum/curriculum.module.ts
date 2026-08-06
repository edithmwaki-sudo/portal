import { Module } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [CurriculumService],
  controllers: [CurriculumController],
  exports: [CurriculumService],
})
export class CurriculumModule {}