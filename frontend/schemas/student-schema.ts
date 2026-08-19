import { z } from "zod";

export const studentStatusSchema = z.enum(["ACTIVE", "INACTIVE", "GRADUATED"]);
export const studentGenderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);
export const nextOfKinRelationshipSchema = z.enum([
  "Partner",
  "Sibling",
  "Father",
  "Mother",
  "Relative",
  "Guardian",
]);

const optionalText = (max: number, message: string) =>
  z
    .string()
    .max(max, message)
    .optional();

const optionalEmail = z
  .union([z.string().email("Enter a valid email address"), z.literal("")])
  .optional();

export const studentFormSchema = z.object({
  // Admission (select values are strings — converted to numbers on submit)
  courseId: z.string().min(1, "Course is required"),
  level: z.string().optional(),
  admDate: z.string().optional(),

  // Personal
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(255, "First name must be 255 characters or fewer"),
  middleName: optionalText(255, "Middle name must be 255 characters or fewer"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(255, "Last name must be 255 characters or fewer"),
  email: z.string().email("Enter a valid email address"),
  gender: studentGenderSchema.optional(),
  dateOfBirth: z.string().optional(),
  nationality: optionalText(100, "Nationality must be 100 characters or fewer"),
  nationalId: optionalText(50, "National ID must be 50 characters or fewer"),
  placeOfBirth: optionalText(100, "Place of birth must be 100 characters or fewer"),
  religion: optionalText(100, "Religion must be 100 characters or fewer"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .max(50, "Phone must be 50 characters or fewer"),
  alternativePhoneNumber: optionalText(
    50,
    "Alternative phone must be 50 characters or fewer"
  ),
  county: optionalText(100, "County must be 100 characters or fewer"),
  address: optionalText(100, "Address must be 100 characters or fewer"),
  city: optionalText(100, "City must be 100 characters or fewer"),
  postalCode: optionalText(20, "Postal code must be 20 characters or fewer"),
  isPwd: z.boolean(),
  disabilityType: optionalText(100, "Disability must be 100 characters or fewer"),
  disabilityDescription: optionalText(
    1000,
    "Description must be 1000 characters or fewer"
  ),

  // Next of kin
  nextOfKinFirstName: optionalText(100, "Name must be 100 characters or fewer"),
  nextOfKinLastName: optionalText(100, "Name must be 100 characters or fewer"),
  nextOfKinPhone: optionalText(50, "Phone must be 50 characters or fewer"),
  nextOfKinAltPhone: optionalText(50, "Phone must be 50 characters or fewer"),
  nextOfKinEmail: optionalEmail,
  nextOfKinRelationship: nextOfKinRelationshipSchema.optional(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
