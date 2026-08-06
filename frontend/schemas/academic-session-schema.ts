import { z } from "zod";

export const academicSessionSchema = z.object({
  academicYearId: z.number().int().positive("Academic year is required"),
  code: z
    .string()
    .min(1, "Session code is required")
    .max(50, "Session code must be 50 characters or fewer"),
  name: z
    .string()
    .min(1, "Session name is required")
    .max(255, "Session name must be 255 characters or fewer"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
  isActive: z.boolean(),
});

export type AcademicSessionValues = z.infer<typeof academicSessionSchema>;
