import { Module } from '@nestjs/common';
import { CertificationAuthoritiesService } from './certification-authorities.service';
import { CertificationLevelsService } from './certification-levels.service';
import { CertificationGradesService } from './certification-grades.service';
import { CertificationAuthoritiesController } from './certification-authorities.controller';
import { CertificationLevelsController } from './certification-levels.controller';
import { CertificationGradesController } from './certification-grades.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [
    CertificationAuthoritiesService,
    CertificationLevelsService,
    CertificationGradesService,
  ],
  controllers: [
    CertificationAuthoritiesController,
    CertificationLevelsController,
    CertificationGradesController,
  ],
  exports: [
    CertificationAuthoritiesService,
    CertificationLevelsService,
    CertificationGradesService,
  ],
})
export class CertificationModule {}
