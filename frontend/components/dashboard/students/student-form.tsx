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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AsyncSearchSelect } from "@/components/ui/async-search-select";
import {
  getAllCourseAuthorityOptions,
  getAllCourseLevelOptions,
  getCourseCurriculaByCourse,
  getCourses,
  type AsyncOption,
  type Course,
} from "@/lib/api/courses";
import {
  createStudent,
  getNextAdmissionNumber,
  updateStudent,
  type CourseEnrolment,
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

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "GRADUATED", label: "Graduated" },
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

function buildCourseFromEnrolment(
  enrolment: CourseEnrolment | null
): Course | null {
  if (!enrolment || !enrolment.courseId) return null;
  return {
    id: enrolment.courseId,
    code: enrolment.courseCode ?? "",
    initials: enrolment.courseInitials ?? "",
    name: enrolment.courseName ?? "",
    durationMonths: null,
    description: null,
    isActive: true,
    certificationAuthorityId: null,
    certificationAuthorityCode: null,
    certificationAuthorityName: enrolment.authorityName,
    certificationLevelId: null,
    certificationLevelCode: null,
    certificationLevelName: enrolment.levelName,
    departmentId: null,
    departmentName: enrolment.departmentName,
    curricula: [
      {
        id: enrolment.curriculumId ?? 0,
        courseCurriculumId: enrolment.courseCurriculumId,
        cycleName: enrolment.curriculumName ?? "",
        isActive: true,
      },
    ],
    createdAt: "",
    updatedAt: "",
  };
}

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
  const [levelId, setLevelId] = useState<string>(() =>
    student?.activeEnrolment?.certificationLevelId != null
      ? String(student.activeEnrolment.certificationLevelId)
      : ""
  );
  const [authorityOptions, setAuthorityOptions] = useState<AsyncOption[]>([]);
  const [levelOptions, setLevelOptions] = useState<AsyncOption[]>([]);
  const [curriculumOptions, setCurriculumOptions] = useState<AsyncOption[]>([]);
  const [courseOptions, setCourseOptions] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(() =>
    student ? buildCourseFromEnrolment(student.activeEnrolment) : null
  );
  const [admissionPreview, setAdmissionPreview] = useState<string | null>(null);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: student
      ? {
          courseId:
            student.activeEnrolment?.courseId != null
              ? String(student.activeEnrolment.courseId)
              : "",
          curriculumId: student.activeEnrolment
            ? String(student.activeEnrolment.curriculumId)
            : "",
          level: student.level != null ? String(student.level) : "",
          admDate: student.admDate?.slice(0, 10) ?? "",
          status: student.status ?? "ACTIVE",
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
          courseId: "",
          curriculumId: "",
          level: "",
          admDate: new Date().toISOString().slice(0, 10),
          status: "ACTIVE",
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
  const courseIdValue = form.watch("courseId");
  const curriculumIdValue = form.watch("curriculumId");
  const selectedCourseId = selectedCourse?.id ?? null;

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

  useEffect(() => {
    if (!authorityId) {
      setLevelOptions([]);
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

  useEffect(() => {
    if (!courseIdValue) {
      setCurriculumOptions([]);
      return;
    }
    let cancelled = false;
    getCourseCurriculaByCourse(Number(courseIdValue))
      .then((options) => {
        if (!cancelled) setCurriculumOptions(options);
      })
      .catch(() => {
        if (!cancelled) setCurriculumOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [courseIdValue]);

  const fetchCourseOptions = useCallback(
    async (search: string) => {
      if (!authorityId || !levelId) return [];
      const response = await getCourses({
        page: 1,
        limit: 10,
        search,
        certificationAuthorityId: Number(authorityId),
        certificationLevelId: Number(levelId),
      });
      setCourseOptions(response.items);
      return response.items.map((course) => ({
        id: course.id,
        label: `${course.code} - ${course.name}`,
      }));
    },
    [authorityId, levelId]
  );

  function handleAuthorityChange(value: string | undefined) {
    setAuthorityId(value ?? "");
    setLevelId("");
    form.setValue("courseId", "", { shouldValidate: true });
    form.setValue("curriculumId", "", { shouldValidate: true });
    setSelectedCourse(null);
  }

  function handleLevelChange(value: string | undefined) {
    setLevelId(value ?? "");
    form.setValue("courseId", "", { shouldValidate: true });
    form.setValue("curriculumId", "", { shouldValidate: true });
    setSelectedCourse(null);
  }

  function handleCourseChange(value: string | undefined) {
    form.setValue("courseId", value ?? "", { shouldValidate: true });
    form.setValue("curriculumId", "", { shouldValidate: true });
    if (!value) {
      setSelectedCourse(null);
      return;
    }
    const course = courseOptions.find((item) => String(item.id) === value);
    setSelectedCourse(course ?? null);
  }

  useEffect(() => {
    if (isEditing || !selectedCourseId) {
      setAdmissionPreview(null);
      return;
    }
    let cancelled = false;
    getNextAdmissionNumber(selectedCourseId)
      .then((meta) => {
        if (!cancelled) setAdmissionPreview(meta.nextAdmissionNumber);
      })
      .catch(() => {
        if (!cancelled) setAdmissionPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, isEditing]);

  async function onSubmit(values: StudentFormValues) {
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
      courseId: Number(values.courseId),
      curriculumId: Number(values.curriculumId),
      level: values.level ? Number(values.level) : undefined,
      admDate: values.admDate || undefined,
      status: values.status,
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormItem>
              <RequiredLabel>Exam Body</RequiredLabel>
              <FormControl>
                <AsyncSearchSelect<AsyncOption>
                  value={authorityId || undefined}
                  onValueChange={handleAuthorityChange}
                  getOptions={async () => authorityOptions}
                  preloadedOptions={authorityOptions}
                  selectedLabel={
                    student?.activeEnrolment?.authorityName ?? undefined
                  }
                  placeholder="Select exam body"
                  searchPlaceholder="Search by code or name..."
                  disabled={isSubmitting || isEditing}
                  minChars={1}
                  emptyMessage="No active exam bodies found."
                />
              </FormControl>
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
                    authorityId ? "Select level" : "Select exam body first"
                  }
                  searchPlaceholder="Search by name or code..."
                  disabled={isSubmitting || isEditing || !authorityId}
                  minChars={1}
                  emptyMessage="No levels found for this exam body."
                />
              </FormControl>
            </FormItem>
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Course</RequiredLabel>
                  <FormControl>
                    <AsyncSearchSelect
                      value={field.value || undefined}
                      onValueChange={handleCourseChange}
                      getOptions={fetchCourseOptions}
                      selectedLabel={
                        student?.activeEnrolment
                          ? `${student.activeEnrolment.courseCode} - ${student.activeEnrolment.courseName}`
                          : undefined
                      }
                      placeholder={
                        levelId ? "Select course" : "Select level first"
                      }
                      searchPlaceholder="Search by code or name..."
                      disabled={isSubmitting || isEditing || !levelId}
                      minChars={1}
                      emptyMessage="No courses found for this level and exam body."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="curriculumId"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Curriculum</RequiredLabel>
                  <FormControl>
                    <AsyncSearchSelect
                      key={courseIdValue ?? "none"}
                      value={field.value || undefined}
                      onValueChange={(next) => field.onChange(next ?? "")}
                      getOptions={async () => curriculumOptions}
                      preloadedOptions={curriculumOptions}
                      selectedLabel={
                        student?.activeEnrolment?.curriculumName ?? undefined
                      }
                      placeholder={
                        courseIdValue
                          ? "Select curriculum"
                          : "Select course first"
                      }
                      searchPlaceholder="Search by cycle name..."
                      disabled={isSubmitting || isEditing || !courseIdValue}
                      minChars={1}
                      emptyMessage="No active curriculum for this course."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {selectedCourse ? (
            <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Course</span>
                <p className="font-medium">
                  {selectedCourse.code} — {selectedCourse.name}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Certification Authority</span>
                <p className="font-medium">
                  {selectedCourse.certificationAuthorityName ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Certification Level</span>
                <p className="font-medium">
                  {selectedCourse.certificationLevelName ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Department</span>
                <p className="font-medium">
                  {selectedCourse.departmentName ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Curriculum</span>
                <p className="font-medium">
                  {student?.activeEnrolment?.curriculumName ??
                    curriculumOptions.find(
                      (option) => String(option.id) === curriculumIdValue
                    )?.label ??
                    "—"}
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
              {selectedCourse.durationMonths ? (
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <p className="font-medium">
                    {selectedCourse.durationMonths} months
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Level</FormLabel>
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
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
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
          </div>
        </FormSection>

        <FormSection title="Personal Details">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  <FormDescription>
                    The student&apos;s login identifier.
                  </FormDescription>
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
                  <FormDescription>
                    Used as the student&apos;s one-time default password.
                  </FormDescription>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
