"use client"

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import axios from "axios";

import { FormSection } from "@/components/dashboard/users/form-section";
import { RequiredLabel } from "@/components/dashboard/required-label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AsyncSearchSelect } from "@/components/ui/async-search-select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createStaff,
  getStaffMeta,
  type CreateStaffPayload,
  type StaffMeta,
  type StaffResponse,
} from "@/lib/api/staff";
import {
  createStaffSchema,
  type CreateStaffValues,
} from "@/schemas/staff-schema";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const EMPLOYMENT_TYPES = [
  { value: "Permanent", label: "Permanent" },
  { value: "Contract", label: "Contract" },
  { value: "Part-time", label: "Part-time" },
  { value: "Casual", label: "Casual" },
];

const QUALIFICATIONS = [
  { value: "PHD", label: "PHD" },
  { value: "Masters", label: "Masters" },
  { value: "Degree", label: "Degree" },
  { value: "Diploma", label: "Diploma" },
  { value: "Certificate", label: "Certificate" },
  { value: "Other", label: "Other" },
];

const RELATIONSHIPS = [
  { value: "Partner", label: "Partner" },
  { value: "Sibling", label: "Sibling" },
  { value: "Father", label: "Father" },
  { value: "Mother", label: "Mother" },
  { value: "Relative", label: "Relative" },
  { value: "Guardian", label: "Guardian" },
];

interface StaffFormProps {
  onSuccess?: (staff: StaffResponse) => void;
  onCancel?: () => void;
}

export function StaffForm({ onSuccess, onCancel }: StaffFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meta, setMeta] = useState<StaffMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStaffMeta()
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load roles and departments.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roleOptions =
    meta?.roles.map((role) => ({
      id: role.id,
      label: role.displayName,
    })) ?? [];

  const departmentOptions =
    meta?.departments.map((department) => ({
      id: department.id,
      label: department.name,
    })) ?? [];

  const form = useForm<CreateStaffValues>({
    resolver: zodResolver(createStaffSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      role: "",
      firstName: "",
      middleName: "",
      lastName: "",
      gender: undefined,
      dateOfBirth: "",
      nationality: "",
      nationalId: "",
      placeOfBirth: "",
      religion: "",
      phoneNumber: "",
      alternativePhoneNumber: "",
      county: "",
      departmentId: "",
      jobTitle: "",
      employmentType: undefined,
      dateJoined: "",
      contractEndDate: "",
      basicSalary: "",
      status: true,
      kraPin: "",
      nhifNumber: "",
      nssfNumber: "",
      highestQualification: undefined,
      specialization: "",
      isPwd: false,
      disabilityType: "",
      disabilityDescription: "",
      nextOfKinFirstName: "",
      nextOfKinLastName: "",
      nextOfKinPhone: "",
      nextOfKinAltPhone: "",
      nextOfKinEmail: "",
      nextOfKinRelationship: undefined,
    },
  });

  async function onSubmit(values: CreateStaffValues) {
    setIsSubmitting(true);
    try {
      const roleName =
        meta?.roles.find((role) => String(role.id) === values.role)?.name ??
        values.role;

      const payload: CreateStaffPayload = {
        email: values.email,
        role: roleName,
        firstName: values.firstName,
        middleName: values.middleName,
        lastName: values.lastName,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth,
        nationality: values.nationality,
        nationalId: values.nationalId,
        placeOfBirth: values.placeOfBirth,
        religion: values.religion,
        phoneNumber: values.phoneNumber,
        alternativePhoneNumber: values.alternativePhoneNumber,
        county: values.county,
        departmentId: Number(values.departmentId),
        jobTitle: values.jobTitle,
        employmentType: values.employmentType,
        dateJoined: values.dateJoined || undefined,
        contractEndDate: values.contractEndDate || undefined,
        basicSalary:
          values.basicSalary === "" || values.basicSalary === undefined
            ? undefined
            : Number(values.basicSalary),
        status: values.status ?? true,
        kraPin: values.kraPin,
        nhifNumber: values.nhifNumber,
        nssfNumber: values.nssfNumber,
        highestQualification: values.highestQualification,
        specialization: values.specialization,
        isPwd: values.isPwd ?? false,
        disabilityType: values.disabilityType,
        disabilityDescription: values.disabilityDescription,
        nextOfKinFirstName: values.nextOfKinFirstName,
        nextOfKinLastName: values.nextOfKinLastName,
        nextOfKinPhone: values.nextOfKinPhone,
        nextOfKinAltPhone: values.nextOfKinAltPhone,
        nextOfKinEmail: values.nextOfKinEmail,
        nextOfKinRelationship: values.nextOfKinRelationship,
      };

      const staff = await createStaff(payload);
      toast.success("Staff member onboarded successfully");
      form.reset();
      onSuccess?.(staff);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const message =
          err.response.data?.message ??
          "A staff member with this email or employee number already exists";
        toast.error(message);
      } else if (axios.isAxiosError(err) && err.response?.status === 400) {
        const message =
          (err.response.data as { message?: string[] | string })?.message ??
          "Please check the highlighted fields.";
        const text = Array.isArray(message) ? message.join(", ") : message;
        toast.error(text);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormSection title="Account Details">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Email</RequiredLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="e.g. john@example.com"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Role</RequiredLabel>
                  <FormControl>
                    <AsyncSearchSelect
                      value={field.value || undefined}
                      onValueChange={(next) => field.onChange(next ?? "")}
                      getOptions={() => Promise.resolve(roleOptions)}
                      preloadedOptions={roleOptions}
                      placeholder="Select a role"
                      searchPlaceholder="Search roles..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Employee Number</FormLabel>
              <Input
                value={meta?.nextEmployeeNumber ?? ""}
                placeholder="Loading..."
                disabled
                readOnly
              />
              <FormDescription>Auto-generated on save.</FormDescription>
            </div>
          </div>
        </FormSection>

        <FormSection title="Personal Information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>First Name</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. John" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Michael" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Last Name</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. Doe" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Gender</RequiredLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Date of Birth</RequiredLabel>
                  <FormControl>
                    <Input type="date" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Nationality</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. Kenyan" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nationalId"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>National ID</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12345678" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="placeOfBirth"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Place of Birth</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. Nairobi" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="religion"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Religion</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. Christianity" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Phone Number</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. +254712345678"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alternativePhoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternative Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. +254798765432"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>County</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. Nairobi" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Employment Details">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Department</RequiredLabel>
                  <FormControl>
                    <AsyncSearchSelect
                      value={field.value || undefined}
                      onValueChange={(next) => field.onChange(next ?? "")}
                      getOptions={() => Promise.resolve(departmentOptions)}
                      preloadedOptions={departmentOptions}
                      placeholder="Select a department"
                      searchPlaceholder="Search departments..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Job Title</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Senior Lecturer"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employmentType"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Employment Type</RequiredLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateJoined"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Joined</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contractEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract End Date</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="basicSalary"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Basic Salary (KES)</RequiredLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 250000"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-end gap-3 space-y-0 pb-1">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? true}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="grid gap-1.5 leading-none">
                    <FormLabel className="font-medium">Active</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Identification & Benefits">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FormField
              control={form.control}
              name="kraPin"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>KRA PIN</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. KRA001001" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nhifNumber"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>NHIF Number</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. NHIF001001"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nssfNumber"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>NSSF Number</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. NSSF001001"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Academic & Professional">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FormField
              control={form.control}
              name="highestQualification"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Highest Qualification</RequiredLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select qualification" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {QUALIFICATIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Specialization</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Software Engineering"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Disability Information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FormField
              control={form.control}
              name="isPwd"
              render={({ field }) => (
                <FormItem className="flex flex-row items-end gap-3 space-y-0 pb-1">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="grid gap-1.5 leading-none">
                    <FormLabel className="font-medium">
                      Person living with a disability
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="disabilityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disability Type</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Visual impairment"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="disabilityDescription"
              render={({ field }) => (
                <FormItem className="lg:col-span-2 xl:col-span-3">
                  <FormLabel>Disability Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Describe the disability"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Next of Kin">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FormField
              control={form.control}
              name="nextOfKinFirstName"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>First Name</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextOfKinLastName"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Last Name</RequiredLabel>
                  <FormControl>
                    <Input placeholder="e.g. Doe" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextOfKinRelationship"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Relationship</RequiredLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RELATIONSHIPS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextOfKinPhone"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Phone Number</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. +254723456789"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextOfKinAltPhone"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Alternative Phone</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. +254733456789"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextOfKinEmail"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Email</RequiredLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="e.g. jane.doe@email.com"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              form.reset();
              onCancel?.();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Saving..." : "Onboard Staff"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
