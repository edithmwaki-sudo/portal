import { z } from "zod";

export const curriculumSchema = z.object({
  /** Select-sourced string id of the authority — converted to number on submit. */
  certificationAuthorityId: z.string().min(1, "Certification authority is required"),
  cycleName: z
    .string()
    .min(1, "Cycle name is required")
    .max(100, "Cycle name must be 100 characters or fewer"),
});

export type CurriculumValues = z.infer<typeof curriculumSchema>;