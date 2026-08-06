import { z } from "zod";

export const genderSchema = z.enum(["male", "female", "other"]);

export const employmentTypeSchema = z.enum([
  "Permanent",
  "Contract",
  "Part-time",
  "Casual",
]);

export const qualificationSchema = z.enum([
  "PHD",
  "Masters",
  "Degree",
  "Diploma",
  "Certificate",
  "Other",
]);

export const relationshipSchema = z.enum([
  "Partner",
  "Sibling",
  "Father",
  "Mother",
  "Relative",
  "Guardian",
]);

const requiredText = (field: string, max: number) =>
  z.string().trim().min(1, `${field} is required`).max(max, `${field} is too long`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional();

export const createStaffSchema = z.object({
  // Section 1: Account details
  email: z.string().trim().email("Enter a valid email address"),
  role: z.string().min(1, "Role is required"),

  // Section 2: Personal information
  firstName: requiredText("First name", 255),
  middleName: optionalText(255),
  lastName: requiredText("Last name", 255),
  gender: genderSchema,
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: requiredText("Nationality", 255),
  nationalId: requiredText("National ID", 255),
  placeOfBirth: requiredText("Place of birth", 255),
  religion: requiredText("Religion", 255),
  phoneNumber: requiredText("Phone number", 50),
  alternativePhoneNumber: optionalText(50),
  county: requiredText("County", 255),

  // Section 3: Employment details
  departmentId: z.string().min(1, "Department is required"),
  jobTitle: requiredText("Job title", 255),
  employmentType: employmentTypeSchema,
  dateJoined: z.string().optional(),
  contractEndDate: z.string().optional(),
  basicSalary: z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), {
      message: "Basic salary must be a valid number",
    })
    .optional(),
  status: z.boolean().optional(),

  // Section 5: Identification & benefits
  kraPin: requiredText("KRA PIN", 255),
  nhifNumber: requiredText("NHIF number", 255),
  nssfNumber: requiredText("NSSF number", 255),

  // Section 6: Academic & professional
  highestQualification: qualificationSchema,
  specialization: requiredText("Specialization", 255),

  // Section 7: Disability information
  isPwd: z.boolean().optional(),
  disabilityType: optionalText(255),
  disabilityDescription: optionalText(1000),

  // Section 8: Next of kin
  nextOfKinFirstName: requiredText("Next of kin first name", 255),
  nextOfKinLastName: requiredText("Next of kin last name", 255),
  nextOfKinPhone: requiredText("Next of kin phone", 50),
  nextOfKinAltPhone: requiredText("Next of kin alternative phone", 50),
  nextOfKinEmail: z
    .string()
    .trim()
    .email("Enter a valid next of kin email"),
  nextOfKinRelationship: relationshipSchema,
});

export type CreateStaffValues = z.infer<typeof createStaffSchema>;
