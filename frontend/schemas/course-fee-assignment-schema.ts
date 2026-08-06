import { z } from "zod";
import { feeStatusSchema } from "./fee-structure-schema";

export const courseFeeAssignmentSchema = z.object({
  /** Select values (string) — converted to numbers on submit. */
  courseId: z.string().min(1, "Course is required"),
  curriculumId: z.string().min(1, "Curriculum is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  academicSessionId: z.string().min(1, "Academic session is required"),
  feeStructureId: z.string().min(1, "Fee structure is required"),
  effectiveFrom: z.string().min(1, "Effective from date is required"),
  effectiveTo: z.string().optional(),
  remarks: z
    .string()
    .max(2000, "Remarks must be 2000 characters or fewer")
    .optional(),
  status: feeStatusSchema,
});

export type CourseFeeAssignmentValues = z.infer<
  typeof courseFeeAssignmentSchema
>;
