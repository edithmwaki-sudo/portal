import { z } from "zod";

export const departmentSchema = z.object({
  code: z
    .string()
    .min(1, "Department code is required")
    .max(50, "Department code must be 50 characters or fewer"),
  name: z
    .string()
    .min(1, "Department name is required")
    .max(255, "Department name must be 255 characters or fewer"),
  /** Select value (string) — converted to a number on submit. */
  headOfDepartmentId: z.string().optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
});

export type DepartmentValues = z.infer<typeof departmentSchema>;