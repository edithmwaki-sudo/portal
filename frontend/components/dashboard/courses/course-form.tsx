"use client"

import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AsyncSearchSelect, type AsyncSearchOption } from "@/components/ui/async-search-select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RequiredLabel } from "@/components/dashboard/required-label";
import {
  createCourse,
  updateCourse,
  getCourseAuthorityOptions,
  getAllCourseLevelOptions,
  getAllCourseCurriculumOptions,
  getCourseDepartmentOptions,
  type Course,
} from "@/lib/api/courses";
import { courseSchema, createCourseSchema, type CourseValues } from "@/schemas/course-schema";

const FULL_WIDTH = "md:col-span-2 xl:col-span-3";

interface CourseFormProps {
  course?: Course;
  onSuccess?: (course: Course) => void;
  onCancel?: () => void;
}

export function CourseForm({ course, onSuccess, onCancel }: CourseFormProps) {
  const isEditing = !!course;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authorityLabel = course
    ? `${course.certificationAuthorityCode} ${course.certificationAuthorityName}`.trim()
    : undefined;
  const levelLabel = course
    ? `${course.certificationLevelName} (${course.certificationLevelCode})`.trim()
    : undefined;
  const departmentLabel = course?.departmentName ?? undefined;

  const form = useForm<CourseValues>({
    resolver: zodResolver(isEditing ? courseSchema : createCourseSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      code: course?.code ?? "",
      name: course?.name ?? "",
      initials: course?.initials ?? "",
      certificationAuthorityId: course?.certificationAuthorityId
        ? String(course.certificationAuthorityId)
        : "",
      certificationLevelId: course?.certificationLevelId
        ? String(course.certificationLevelId)
        : "",
      curriculumId: "",
      departmentId: course?.departmentId
        ? String(course.departmentId)
        : "",
      description: course?.description ?? "",
    },
  });

  const watchedAuthority = form.watch("certificationAuthorityId");
  const authorityId = Number(watchedAuthority) || 0;

  const [levelOptions, setLevelOptions] = useState<AsyncSearchOption[]>([]);
  const [curriculumOptions, setCurriculumOptions] = useState<
    AsyncSearchOption[]
  >([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [loadingCurricula, setLoadingCurricula] = useState(false);

  useEffect(() => {
    if (!authorityId) {
      setLevelOptions([]);
      setCurriculumOptions([]);
      setLoadingLevels(false);
      setLoadingCurricula(false);
      return;
    }
    let cancelled = false;
    setLoadingLevels(true);
    setLoadingCurricula(true);
    Promise.all([
      getAllCourseLevelOptions(authorityId).catch(() => []),
      getAllCourseCurriculumOptions(authorityId).catch(() => []),
    ]).then(([levels, curricula]) => {
      if (cancelled) return;
      setLevelOptions(levels);
      setCurriculumOptions(curricula);
    }).finally(() => {
      if (!cancelled) {
        setLoadingLevels(false);
        setLoadingCurricula(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authorityId]);

  const fetchAuthorityOptions = useCallback(
    (search: string) => getCourseAuthorityOptions(search),
    []
  );

  const fetchLevelOptions = useCallback(
    async (search: string) => {
      const term = search.trim().toLowerCase();
      return levelOptions.filter((option) =>
        option.label.toLowerCase().includes(term)
      );
    },
    [levelOptions]
  );

  const fetchCurriculumOptions = useCallback(
    async (search: string) => {
      const term = search.trim().toLowerCase();
      return curriculumOptions.filter((option) =>
        option.label.toLowerCase().includes(term)
      );
    },
    [curriculumOptions]
  );

  const fetchDepartmentOptions = useCallback(
    (search: string) => getCourseDepartmentOptions(search),
    []
  );

  async function onSubmit(values: CourseValues) {
    setIsSubmitting(true);
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      initials: values.initials.trim(),
      certificationAuthorityId: Number(values.certificationAuthorityId),
      certificationLevelId: Number(values.certificationLevelId),
      departmentId: Number(values.departmentId),
      description: values.description?.trim() || undefined,
      ...(!isEditing ? { curriculumId: Number(values.curriculumId) } : {}),
    };

    try {
      const result = isEditing
        ? await updateCourse(course.id, payload)
        : await createCourse(payload);
      toast.success(
        isEditing
          ? "Course updated successfully"
          : "Course created successfully"
      );
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("code", {
          message:
            (err.response.data as { message?: string })?.message ??
            "A course with this code already exists",
        });
      } else {
        toast.error(
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Something went wrong. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <RequiredLabel>Course Code</RequiredLabel>
              <FormControl>
                <Input
                  placeholder="e.g. ICT-L6-C4"
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <RequiredLabel>Course Name</RequiredLabel>
              <FormControl>
                <Input
                  placeholder="e.g. ICT Technician Level 6"
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
          name="initials"
          render={({ field }) => (
            <FormItem>
              <RequiredLabel>Initials</RequiredLabel>
              <FormControl>
                <Input
                  placeholder="e.g. ICT"
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
          name="certificationAuthorityId"
          render={({ field }) => (
            <FormItem>
              <RequiredLabel>Certification Authority</RequiredLabel>
              <FormControl>
                <AsyncSearchSelect
                  value={field.value || undefined}
                  onValueChange={(next) => {
                    field.onChange(next ?? "");
                    form.setValue("certificationLevelId", "");
                    form.setValue("curriculumId", "");
                  }}
                  getOptions={fetchAuthorityOptions}
                  selectedLabel={authorityLabel}
                  placeholder="Select a certification authority"
                  searchPlaceholder="Search by code or name..."
                  disabled={isSubmitting}
                  minChars={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="certificationLevelId"
          render={({ field }) => (
            <FormItem>
              <RequiredLabel>Certification Level</RequiredLabel>
              <FormControl>
                <AsyncSearchSelect
                  value={field.value || undefined}
                  onValueChange={(next) => field.onChange(next ?? "")}
                  getOptions={fetchLevelOptions}
                  preloadedOptions={levelOptions}
                  selectedLabel={levelLabel}
                  placeholder={
                    authorityId
                      ? loadingLevels
                        ? "Loading levels..."
                        : "Select a certification level"
                      : "Select a certification authority first"
                  }
                  searchPlaceholder="Search by name or code..."
                  disabled={!authorityId || loadingLevels || isSubmitting}
                  minChars={1}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing ? (
          <FormField
            control={form.control}
            name="curriculumId"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Curriculum</RequiredLabel>
                <FormControl>
                  <AsyncSearchSelect
                    value={field.value || undefined}
                    onValueChange={(next) => field.onChange(next ?? "")}
                    getOptions={fetchCurriculumOptions}
                    preloadedOptions={curriculumOptions}
                    placeholder={
                      authorityId
                        ? loadingCurricula
                          ? "Loading curricula..."
                          : "Link an active curriculum version"
                        : "Select a certification authority first"
                    }
                    searchPlaceholder="Search by cycle name..."
                    disabled={!authorityId || loadingCurricula || isSubmitting}
                    minChars={1}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : course.curricula.length > 0 ? (
          <div className={`rounded-lg border p-4 ${FULL_WIDTH}`}>
            <FormLabel>Linked Curricula</FormLabel>
            <p className="mb-3 text-sm text-muted-foreground">
              Curriculum versions linked to this course.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {course.curricula.map((item) => (
                <li
                  key={item.courseCurriculumId}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{item.cycleName}</span>
                  <span
                    className={
                      item.isActive ? "text-primary" : "text-muted-foreground"
                    }
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
                  getOptions={fetchDepartmentOptions}
                  selectedLabel={departmentLabel}
                  placeholder="Select a department"
                  searchPlaceholder="Search by name or code..."
                  disabled={isSubmitting}
                  minChars={1}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className={FULL_WIDTH}>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the course..."
                  disabled={isSubmitting}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div
          className={`flex items-center justify-end gap-2 pt-2 ${FULL_WIDTH}`}
        >
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Course"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
