import { z } from "zod";

export const studentStatusSchema = z.enum(["ACTIVE", "INACTIVE", "GRADUATED"]);

export const createStudentSchema = z.object({
  // Account + login
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

  // Personal
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().max(100, "Nationality must be 100 characters or fewer").optional(),
  county: z.string().max(100, "County must be 100 characters or fewer").optional(),
  religion: z.string().max(100, "Religion must be 100 characters or fewer").optional(),
  phone: z.string().max(50, "Phone must be 50 characters or fewer").optional(),
  alternativePhoneNumber: z
    .string()
    .max(50, "Alternative phone must be 50 characters or fewer")
    .optional(),
  address: z.string().max(100, "Address must be 100 characters or fewer").optional(),
  city: z.string().max(100, "City must be 100 characters or fewer").optional(),
  isPwd: z.boolean().optional(),
  disabilityType: z.string().max(100, "Disability must be 100 characters or fewer").optional(),
  disabilityDescription: z
    .string()
    .max(1000, "Description must be 1000 characters or fewer")
    .optional(),

  // Admission (ids sent as strings, converted in the form submit)
  admissionNumber: z
    .string()
    .max(50, "Admission number must be 50 characters or fewer")
    .optional(),
  courseId: z.string().optional(),
  level: z.string().optional(),
  admDate: z.string().optional(),
  status: studentStatusSchema.optional(),
});

export type CreateStudentValues = z.infer<typeof createStudentSchema>;
