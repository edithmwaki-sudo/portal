import { z } from "zod";

export const certificationAuthoritySchema = z.object({
  code: z
    .string()
    .min(1, "Authority code is required")
    .max(50, "Authority code must be 50 characters or fewer"),
  name: z
    .string()
    .min(1, "Authority name is required")
    .max(255, "Authority name must be 255 characters or fewer"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
  isActive: z.boolean(),
});

export type CertificationAuthorityValues = z.infer<
  typeof certificationAuthoritySchema
>;

export const certificationLevelSchema = z.object({
  /** Select-sourced string id of the authority — converted to number on submit. */
  certificationAuthorityId: z
    .string()
    .min(1, "Certification authority is required"),
  code: z
    .string()
    .min(1, "Level code is required")
    .max(50, "Level code must be 50 characters or fewer"),
  name: z
    .string()
    .min(1, "Level name is required")
    .max(100, "Level name must be 100 characters or fewer"),
  entryGrade: z
    .string()
    .max(100, "Entry grade must be 100 characters or fewer")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
  isActive: z.boolean(),
});

export type CertificationLevelValues = z.infer<typeof certificationLevelSchema>;

export const certificationGradeSchema = z
  .object({
    grade: z
      .string()
      .min(1, "Grade is required")
      .max(50, "Grade must be 50 characters or fewer"),
    gradeStart: z
      .number({ error: "Grade start is required" })
      .min(0, "Grade start must be at least 0")
      .max(100, "Grade start must be at most 100"),
    gradeEnd: z
      .number({ error: "Grade end is required" })
      .min(0, "Grade end must be at least 0")
      .max(100, "Grade end must be at most 100"),
    remark: z
      .string()
      .max(2000, "Remark must be 2000 characters or fewer")
      .optional(),
    isActive: z.boolean(),
  })
  .refine((value) => value.gradeEnd >= value.gradeStart, {
    message: "Grade end must be greater than or equal to grade start",
    path: ["gradeEnd"],
  });

export type CertificationGradeValues = z.infer<
  typeof certificationGradeSchema
>;