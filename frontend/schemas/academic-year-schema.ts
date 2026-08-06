import { z } from "zod";

export const academicYearSchema = z.object({
  code: z
    .string()
    .min(1, "Year code is required")
    .max(50, "Year code must be 50 characters or fewer"),
  name: z
    .string()
    .min(1, "Year name is required")
    .max(255, "Year name must be 255 characters or fewer"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
  sessionsPerYear: z
    .union([z.string(), z.number()])
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        value === null ||
        value === "" ||
        (Number.isInteger(Number(value)) &&
          Number(value) >= 1 &&
          Number(value) <= 12),
      "Session count must be a whole number from 1 to 12"
    ),
  isActive: z.boolean(),
});

export type AcademicYearValues = z.infer<typeof academicYearSchema>;
