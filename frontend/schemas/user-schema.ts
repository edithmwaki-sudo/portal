import { z } from "zod";

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(100, "Username must be 100 characters or fewer"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(255, "Password must be 255 characters or fewer"),
  name: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Name must be 255 characters or fewer"),
  roleId: z.string().optional(),
  phone: z.string().max(50, "Phone must be 50 characters or fewer").optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "LOCKED"]).optional(),
  mustResetPassword: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(100, "Username must be 100 characters or fewer"),
  email: z.string().email("Enter a valid email address"),
  name: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Name must be 255 characters or fewer"),
  roleId: z.string().optional(),
  phone: z.string().max(50, "Phone must be 50 characters or fewer").optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "LOCKED"]).optional(),
  mustResetPassword: z.boolean().optional(),
});

export type UpdateUserValues = z.infer<typeof updateUserSchema>;

export const resetUserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(255, "Password must be 255 characters or fewer"),
});

export type ResetUserPasswordValues = z.infer<typeof resetUserPasswordSchema>;