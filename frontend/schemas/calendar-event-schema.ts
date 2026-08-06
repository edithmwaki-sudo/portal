import { z } from "zod";

export const calendarEventSchema = z
  .object({
    eventTypeId: z.coerce
      .number()
      .int()
      .positive("Event type is required"),
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be 255 characters or fewer"),
    description: z
      .string()
      .max(2000, "Description must be 2000 characters or fewer")
      .optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine(
    (values) => {
      if (!values.startDate || !values.endDate) return true;
      return values.endDate >= values.startDate;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export type CalendarEventValues = z.infer<typeof calendarEventSchema>;
