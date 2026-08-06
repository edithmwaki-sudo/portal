import { z } from "zod";

function optionalWholeNumber(min: number, max: number, message: string) {
  return z
    .union([z.string(), z.number()])
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        value === null ||
        value === "" ||
        (Number.isInteger(Number(value)) &&
          Number(value) >= min &&
          Number(value) <= max),
      message
    );
}

export const unitSchema = z.object({
  code: z
    .string()
    .min(1, "Unit code is required")
    .max(50, "Unit code must be 50 characters or fewer"),
  name: z
    .string()
    .min(1, "Unit name is required")
    .max(255, "Unit name must be 255 characters or fewer"),
  modulesTaught: optionalWholeNumber(
    1,
    99,
    "Module count must be a whole number from 1 to 99"
  ),
  taughtHours: optionalWholeNumber(
    1,
    500,
    "Taught hours must be a whole number from 1 to 500"
  ),
  creditFactor: z
    .union([z.string(), z.number()])
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        value === null ||
        value === "" ||
        (Number(value) > 0 && !Number.isNaN(Number(value))),
      "Credit factor must be greater than 0"
    ),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
  isActive: z.boolean(),
});

export type UnitValues = z.infer<typeof unitSchema>;
