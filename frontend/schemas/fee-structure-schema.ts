import { z } from "zod";

export const feeStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const feeStructureItemSchema = z.object({
  itemName: z
    .string()
    .min(1, "Item name is required")
    .max(255, "Item name must be 255 characters or fewer"),
  /** Number input string — converted to a number on submit. */
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((value) => !Number.isNaN(Number(value)), "Amount must be a number")
    .refine((value) => Number(value) >= 0, "Amount must be 0 or greater")
    .refine(
      (value) => Number(value) <= 9999999999.99,
      "Amount must be 9999999999.99 or fewer"
    )
    .refine(
      (value) => Number.isInteger(Math.round(Number(value) * 100)),
      "Amount can have at most 2 decimal places"
    ),
});

export const feeStructureSchema = z.object({
  feeName: z
    .string()
    .min(1, "Fee name is required")
    .max(255, "Fee name must be 255 characters or fewer"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  status: feeStatusSchema,
  items: z
    .array(feeStructureItemSchema)
    .min(1, "Add at least one fee item")
    .refine(
      (items) => {
        const seen = new Set<string>();
        for (const item of items) {
          const key = item.itemName.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
        }
        return true;
      },
      "Item names must be unique within a structure"
    ),
});

export type FeeStructureValues = z.infer<typeof feeStructureSchema>;
export type FeeStructureItemValues = z.infer<typeof feeStructureItemSchema>;
