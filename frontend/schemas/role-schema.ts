import { z } from "zod";

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(50, "Role name must be 50 characters or fewer"),
});

export type CreateRoleValues = z.infer<typeof createRoleSchema>;
