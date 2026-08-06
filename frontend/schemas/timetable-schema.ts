import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const timetableEntrySchema = z
  .object({
    unitId: z.number().int().positive("Unit is required"),
    trainerStaffId: z.number().int().positive("Trainer is required"),
    lectureRoomId: z.number().int().positive("Room is required"),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z
      .string()
      .regex(TIME_RE, "Start time must be in HH:mm format"),
    endTime: z.string().regex(TIME_RE, "End time must be in HH:mm format"),
    type: z.string().min(1).max(30).optional(),
  })
  .refine((values) => values.endTime > values.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type TimetableEntryValues = z.infer<typeof timetableEntrySchema>;

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
