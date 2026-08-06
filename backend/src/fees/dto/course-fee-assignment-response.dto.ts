import { Expose } from 'class-transformer';
import { FeeStatus } from '@prisma/client';

export class CourseFeeAssignmentResponseDto {
  @Expose() id: number;
  @Expose() courseId: number;
  @Expose() courseCode: string;
  @Expose() courseName: string;
  @Expose() curriculumId: number;
  @Expose() curriculumName: string;
  @Expose() academicYearId: number;
  @Expose() academicYearName: string;
  @Expose() academicSessionId: number;
  @Expose() academicSessionName: string;
  @Expose() feeStructureId: number;
  @Expose() feeStructureName: string;
  @Expose() feeStructureStatus: FeeStatus;
  @Expose() itemsCount: number;
  @Expose() effectiveFrom: string;
  @Expose() effectiveTo: string | null;
  @Expose() remarks: string | null;
  @Expose() status: FeeStatus;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
