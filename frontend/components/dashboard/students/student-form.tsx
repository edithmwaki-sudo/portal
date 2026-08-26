"use client"

import { useCallback, useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AsyncSearchSelect } from "@/components/ui/async-search-select";
import {
  getAllCourseAuthorityOptions,
  getAllCourseLevelOptions,
  getAllCourseCurriculumOptions,
  getCourseCurriculumOptions,
  type AsyncOption,
  type CourseCurriculumOption,
} from "@/lib/api/courses";
import {
  createStudent,
  getNextAdmissionNumber,
  updateStudent,
  type CreateStudentPayload,
  type StudentResponse,
} from "@/lib/api/students";
import {
  studentFormSchema,
  type StudentFormValues,
} from "@/schemas/student-schema";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "Partner", label: "Partner" },
  { value: "Sibling", label: "Sibling" },
  { value: "Father", label: "Father" },
  { value: "Mother", label: "Mother" },
  { value: "Relative", label: "Relative" },
  { value: "Guardian", label: "Guardian" },
];

const LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6];

interface StudentFormProps {
  student?: StudentResponse;
  onSuccess?: (student: StudentResponse) => void;
  onCancel?: () => void;
}

export function StudentForm({
  student,
  onSuccess,
  onCancel,
}: StudentFormProps) {
  const isEditing = !!student;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authorityId, setAuthorityId] = useState<string>(() =>
    student?.activeEnrolment?.certificationAuthorityId != null
      ? String(student.activeEnrolment.certificationAuthorityId)
      : ""
  );
  const [authorityOptions, setAuthorityOptions] = useState<AsyncOption[]>([]);
  const [levelId, setLevelId] = useState<string>(() =>
    student?.activeEnrolment?.certificationLevelId != null
      ? String(student.activeEnrolment.certificationLevelId)
      : ""
  );
  const [levelOptions, setLevelOptions] = useState<AsyncOption[]>([]);
  const [curriculumId, setCurriculumId] = useState<string>(() =>
    student?.activeEnrolment?.curriculumId != null
      ? String(student.activeEnrolment.curriculumId)
      : ""
  );
  const [curriculumOptions, setCurriculumOptions] = useState<AsyncOption[]>([]);
  const [courseCurriculumId, setCourseCurriculumId] = useState<string>(() =>
    student?.activeEnrolment?.courseCurriculumId != null
      ? String(student.activeEnrolment.courseCurriculumId)
      : ""
  );
  const [courseCurriculumOptions, setCourseCurriculumOptions] = useState<
    CourseCurriculumOption[]
  >([]);
  // In edit mode the cascade is locked until the user re-selects an authority.
  const [cascadeArmed, setCascadeArmed] = useState(() => !isEditing);
  const [admissionPreview, setAdmissionPreview] = useState<string | null>(null);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: student
      ? {
          level: student.level != null ? String(student.level) : "1",
          admDate: student.admDate?.slice(0, 10) ?? "",
          firstName: student.user.firstName ?? "",
          middleName: student.user.middleName ?? "",
          lastName: student.user.lastName ?? "",
          email: student.user.email ?? "",
          gender: student.user.gender ?? undefined,
          dateOfBirth: student.user.dateOfBirth?.slice(0, 10) ?? "",
          nationality: student.user.nationality ?? "",
          nationalId: student.nationalId ?? "",
          placeOfBirth: student.user.placeOfBirth ?? "",
          religion: student.user.religion ?? "",
          phone: student.user.phone ?? "",
          alternativePhoneNumber: student.user.alternativePhoneNumber ?? "",
          county: student.user.county ?? "",
          address: student.user.address ?? "",
          city: student.user.city ?? "",
          postalCode: student.user.postalCode ?? "",
          isPwd: student.user.isPwd,
          disabilityType: student.user.disabilityType ?? "",
          disabilityDescription: student.user.disabilityDescription ?? "",
          nextOfKinFirstName: student.nextOfKinFirstName ?? "",
          nextOfKinLastName: student.nextOfKinLastName ?? "",
          nextOfKinPhone: student.nextOfKinPhone ?? "",
          nextOfKinAltPhone: student.nextOfKinAltPhone ?? "",
          nextOfKinEmail: student.nextOfKinEmail ?? "",
          nextOfKinRelationship:
            (student.nextOfKinRelationship as StudentFormValues["nextOfKinRelationship"]) ??
            undefined,
        }
      : {
          level: "1",
          admDate: new Date().toISOString().slice(0, 10),
          firstName: "",
          middleName: "",
          lastName: "",
          email: "",
          gender: undefined,
          dateOfBirth: "",
          nationality: "",
          nationalId: "",
          placeOfBirth: "",
          religion: "",
          phone: "",
          alternativePhoneNumber: "",
          county: "",
          address: "",
          city: "",
          postalCode: "",
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

  const isPwd = form.watch("isPwd");

  useEffect(() => {
    let cancelled = false;
    getAllCourseAuthorityOptions()
      .then((options) => {
        if (!cancelled) setAuthorityOptions(options);
      })
      .catch(() => {
        if (!cancelled) setAuthorityOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load levels when authority changes
  useEffect(() => {
    if (!authorityId) {
      setLevelOptions([]);
      setLevelId("");
      setCurriculumOptions([]);
      setCurriculumId("");
      setCourseCurriculumOptions([]);
      setCourseCurriculumId("");
      return;
    }
    let cancelled = false;
    getAllCourseLevelOptions(Number(authorityId))
      .then((options) => {
        if (!cancelled) setLevelOptions(options);
      })
      .catch(() => {
        if (!cancelled) setLevelOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authorityId]);

  // Load curricula when authority changes
  useEffect(() => {
    if (!authorityId) {
      setCurriculumOptions([]);
      setCurriculumId("");
      setCourseCurriculumOptions([]);
      setCourseCurriculumId("");
      return;
    }
    let cancelled = false;
    getAllCourseCurriculumOptions(Number(authorityId))
      .then((options) => {
        if (!cancelled) setCurriculumOptions(options);
      })
      .catch(() => {
        if (!cancelled) setCurriculumOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authorityId]);

  // Load course curricula when authority, level, or curriculum changes
  const fetchCourseCurriculumOptions = useCallback(async () => {
    if (!authorityId) {
      setCourseCurriculumOptions([]);
      setCourseCurriculumId("");
      return;
    }
    let cancelled = false;
    const options = await getCourseCurriculumOptions({
      authorityId: Number(authorityId),
      levelId: levelId ? Number(levelId) : undefined,
      curriculumId: curriculumId ? Number(curriculumId) : undefined,
    });
    if (!cancelled) {
      setCourseCurriculumOptions(options);
      // If current selection is no longer valid, reset
      if (
        courseCurriculumId &&
        !options.some((opt) => String(opt.id) === courseCurriculumId)
      ) {
        setCourseCurriculumId("");
      }
    }
  }, [authorityId, levelId, curriculumId, courseCurriculumId]);

  useEffect(() => {
    fetchCourseCurriculumOptions();
  }, [fetchCourseCurriculumOptions]);

  function handleAuthorityChange(value: string | undefined) {
    setAuthorityId(value ?? "");
    setCascadeArmed(true);
    setLevelId("");
    setCurriculumId("");
    setCourseCurriculumId("");
  }

  function handleLevelChange(value: string | undefined) {
    setLevelId(value ?? "");
    setCourseCurriculumId("");
  }

  function handleCurriculumChange(value: string | undefined) {
    setCurriculumId(value ?? "");
    setCourseCurriculumId("");
  }

  function handleCourseCurriculumChange(value: string | undefined) {
    setCourseCurriculumId(value ?? "");
  }

  useEffect(() => {
    if (isEditing || !courseCurriculumId) {
      setAdmissionPreview(null);
      return;
    }
    const selected = courseCurriculumOptions.find(
      (opt) => String(opt.id) === courseCurriculumId
    );
    if (selected) {
      let cancelled = false;
      getNextAdmissionNumber(selected.courseId)
        .then((meta) => {
          if (!cancelled) setAdmissionPreview(meta.nextAdmissionNumber);
        })
        .catch(() => {
          if (!cancelled) setAdmissionPreview(null);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [courseCurriculumId, isEditing, courseCurriculumOptions]);

  async function onSubmit(values: StudentFormValues) {
    if (!courseCurriculumId) {
      toast.error("Please select the certification authority, level, curriculum and course.");
      return;
    }
    setIsSubmitting(true);
    const payload: CreateStudentPayload = {
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      middleName: values.middleName?.trim() || undefined,
      lastName: values.lastName.trim(),
      gender: values.gender,
      dateOfBirth: values.dateOfBirth || undefined,
      nationality: values.nationality?.trim() || undefined,
      nationalId: values.nationalId?.trim() || undefined,
      placeOfBirth: values.placeOfBirth?.trim() || undefined,
      religion: values.religion?.trim() || undefined,
      phone: values.phone.trim(),
      alternativePhoneNumber: values.alternativePhoneNumber?.trim() || undefined,
      county: values.county?.trim() || undefined,
      address: values.address?.trim() || undefined,
      city: values.city?.trim() || undefined,
      postalCode: values.postalCode?.trim() || undefined,
      isPwd: values.isPwd,
      disabilityType: values.disabilityType?.trim() || undefined,
      disabilityDescription: values.disabilityDescription?.trim() || undefined,
      nextOfKinFirstName: values.nextOfKinFirstName?.trim() || undefined,
      nextOfKinLastName: values.nextOfKinLastName?.trim() || undefined,
      nextOfKinPhone: values.nextOfKinPhone?.trim() || undefined,
      nextOfKinAltPhone: values.nextOfKinAltPhone?.trim() || undefined,
      nextOfKinEmail: values.nextOfKinEmail?.trim() || undefined,
      nextOfKinRelationship: values.nextOfKinRelationship,
      authorityId: authorityId ? Number(authorityId) : undefined,
      levelId: levelId ? Number(levelId) : undefined,
      curriculumId: curriculumId ? Number(curriculumId) : undefined,
      courseCurriculumId: Number(courseCurriculumId),
      level: values.level ? Number(values.level) : undefined,
      admDate: values.admDate || undefined,
    };

    try {
      const result = isEditing
        ? await updateStudent(student.id, payload)
        : await createStudent(payload);
      toast.success(
        isEditing
          ? "Student updated successfully"
          : "Student admitted successfully"
      );
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const message =
          (err.response.data as { message?: string | string[] })?.message ??
          "A student with this email already exists";
        toast.error(Array.isArray(message) ? message.join(", ") : message, {
          duration: 6000,
        });
      } else if (axios.isAxiosError(err) && err.response?.status === 400) {
        const message =
          (err.response.data as { message?: string | string[] })?.message ??
          "Please check the highlighted fields.";
        toast.error(Array.isArray(message) ? message.join(", ") : message);
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
        <FormSection title="Admission Information">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FormItem>
              <RequiredLabel>Certification Authority</RequiredLabel>
              <FormControl>
                <AsyncSearchSelect<AsyncOption>
                  value={authorityId || undefined}
                  onValueChange={handleAuthorityChange}
                  getOptions={async () => authorityOptions}
                  preloadedOptions={authorityOptions}
                  selectedLabel={
                    student?.activeEnrolment?.authorityName ?? undefined
                  }
                  placeholder="Select certification authority"
                  searchPlaceholder="Search by code or name..."
                  disabled={isSubmitting}
                  minChars={1}
                  emptyMessage="No active certification authorities found."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormItem>
              <RequiredLabel>Certification Level</RequiredLabel>
              <FormControl>
                <AsyncSearchSelect<AsyncOption>
                  value={levelId || undefined}
                  onValueChange={handleLevelChange}
                  getOptions={async () => levelOptions}
                  preloadedOptions={levelOptions}
                  selectedLabel={
                    student?.activeEnrolment?.levelName ?? undefined
                  }
                  placeholder={
                    authorityId && cascadeArmed
                      ? "Select certification level"
                      : "Select authority first"
                  }
                  searchPlaceholder="Search by name or code..."
                  disabled={isSubmitting || !authorityId || !cascadeArmed}
                  minChars={1}
                  emptyMessage="No active levels for this authority."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormItem>
              <RequiredLabel>Curriculum</RequiredLabel>
              <FormControl>
                <AsyncSearchSelect<AsyncOption>
                  value={curriculumId || undefined}
                  onValueChange={handleCurriculumChange}
                  getOptions={async () => curriculumOptions}
                  preloadedOptions={curriculumOptions}
                  selectedLabel={
                    student?.activeEnrolment?.curriculumName ?? undefined
                  }
                  placeholder={
                    authorityId && cascadeArmed ? "Select curriculum" : "Select authority first"
                  }
                  searchPlaceholder="Search by cycle name..."
                  disabled={isSubmitting || !authorityId || !cascadeArmed}
                  minChars={1}
                  emptyMessage="No active curricula for this authority."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormItem>
              <RequiredLabel>Course</RequiredLabel>
              <FormControl>
                <AsyncSearchSelect<CourseCurriculumOption>
                  value={courseCurriculumId || undefined}
                  onValueChange={handleCourseCurriculumChange}
                  getOptions={async () => courseCurriculumOptions}
                  preloadedOptions={courseCurriculumOptions}
                  selectedLabel={
                    student?.activeEnrolment
                      ? `${student.activeEnrolment.courseCode} — ${student.activeEnrolment.courseName} (${student.activeEnrolment.curriculumName})`
                      : undefined
                  }
                  placeholder={
                    authorityId && levelId && curriculumId
                      ? "Select course"
                      : "Complete the filters above"
                  }
                  searchPlaceholder="Search by course code or name..."
                  disabled={
                    isSubmitting ||
                    !authorityId ||
                    !cascadeArmed ||
                    !levelId ||
                    !curriculumId
                  }
                  minChars={1}
                  emptyMessage="No courses match the selected filters."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year of Entry</FormLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEVEL_OPTIONS.map((level) => (
                        <SelectItem key={level} value={String(level)}>
                          Year {level}
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
              name="admDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admission Date</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {courseCurriculumId ? (
            (() => {
              const selected = courseCurriculumOptions.find(
                (opt) => String(opt.id) === courseCurriculumId
              );
              if (!selected) return null;
              return (
                <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Course</span>
                    <p className="font-medium">
                      {selected.courseCode} — {selected.courseName}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Certification Authority</span>
                    <p className="font-medium">
                      {student?.activeEnrolment?.authorityName ??
                        authorityOptions.find((a) => String(a.id) === authorityId)?.label ??
                        "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Certification Level</span>
                    <p className="font-medium">
                      {student?.activeEnrolment?.levelName ??
                        levelOptions.find((l) => String(l.id) === levelId)?.label ??
                        "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Curriculum</span>
                    <p className="font-medium">
                      {selected.cycleName}
                    </p>
                  </div>
                  {isEditing ? (
                    <div>
                      <span className="text-muted-foreground">Admission Number</span>
                      <p className="font-mono font-semibold">
                        {student?.admissionNumber ?? "—"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-muted-foreground">Next Admission Number</span>
                      <p className="font-mono font-semibold">
                        {admissionPreview ?? "…"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()
          ) : null}
        </FormSection>

        <FormSection title="Personal Details">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <FormField
              control={form.control}
              name="firstName"
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
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Name</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Email</RequiredLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="e.g. jane@example.com"
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
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
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
                  <FormLabel>Date of Birth</FormLabel>
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
                  <FormLabel>Nationality</FormLabel>
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
                  <FormLabel>National ID</FormLabel>
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
                  <FormLabel>Place of Birth</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
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
                  <FormLabel>Religion</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Phone</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 0712 345 678"
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
                    <Input disabled={isSubmitting} {...field} />
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
                  <FormLabel>County</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        <FormSection title="Disability (PWD)">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <FormField
              control={form.control}
              name="isPwd"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="grid gap-1.5 leading-none">
                    <FormLabel>Person living with a disability</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {isPwd ? (
              <>
                <FormField
                  control={form.control}
                  name="disabilityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disability Type</FormLabel>
                      <FormControl>
                        <Input disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="disabilityDescription"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 xl:col-span-3">
                      <FormLabel>Disability Description</FormLabel>
                      <FormControl>
                        <Input disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}
          </div>
        </FormSection>

        <FormSection title="Next of Kin">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <FormField
              control={form.control}
              name="nextOfKinFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
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
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
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
                  <FormLabel>Relationship</FormLabel>
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
                      {RELATIONSHIP_OPTIONS.map((option) => (
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
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
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
                  <FormLabel>Alternative Phone</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="e.g. parent@example.com"
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

        <div className="flex items-center justify-end gap-2 rounded-lg bg-card p-6 shadow-lg shadow-black/5">
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
            {isSubmitting
              ? isEditing
                ? "Saving..."
                : "Admitting..."
              : isEditing
                ? "Save Changes"
                : "Admit Student"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
