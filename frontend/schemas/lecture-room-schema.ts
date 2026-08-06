import { z } from "zod";

export const lectureRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Room name is required")
    .max(255, "Room name must be 255 characters or fewer"),
  code: z
    .string()
    .min(1, "Room code is required")
    .max(50, "Room code must be 50 characters or fewer"),
  capacity: z
    .union([z.string(), z.number()])
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        value === null ||
        value === "" ||
        (Number.isInteger(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= 100000),
      "Capacity must be a whole number from 0 to 100000"
    ),
  location: z
    .string()
    .max(255, "Location must be 255 characters or fewer")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
  isActive: z.boolean(),
});

export type LectureRoomValues = z.infer<typeof lectureRoomSchema>;
