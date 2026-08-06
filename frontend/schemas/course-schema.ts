import { z } from "zod";

export const courseSchema = z.object({
  code: z
    .string()
    .min(1, "Course code is required")
    .max(50, "Course code must be 50 characters or fewer"),
  initials: z
    .string()
    .min(1, "Initials are required")
    .max(20, "Initials must be 20 characters or fewer"),
  name: z
    .string()
    .min(1, "Course name is required")
    .max(255, "Course name must be 255 characters or fewer"),
  /** Select-sourced string ids - converted to numbers on submit. */
  certificationAuthorityId: z
    .string()
    .min(1, "Certification authority is required"),
  certificationLevelId: z
    .string()
    .min(1, "Certification level is required"),
  departmentId: z.string().min(1, "Department is required"),
  durationMonths: z
    .string()
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        value === "" ||
        (Number.isInteger(Number(value)) && Number(value) > 0),
      "Total months must be a positive whole number"
    ),
  curriculumId: z.string().optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
});

/** Create-only: a curriculum must be assigned during course registration. */
export const createCourseSchema = courseSchema.extend({
  curriculumId: z.string().min(1, "Curriculum is required"),
});

export type CourseValues = z.infer<typeof courseSchema>;
