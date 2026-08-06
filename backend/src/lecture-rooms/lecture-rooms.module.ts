import { Module } from '@nestjs/common';
import { LectureRoomsService } from './lecture-rooms.service';
import { LectureRoomsController } from './lecture-rooms.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [LectureRoomsService],
  controllers: [LectureRoomsController],
  exports: [LectureRoomsService],
})
export class LectureRoomsModule {}
