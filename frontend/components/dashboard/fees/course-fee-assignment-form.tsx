"use client"

import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { RequiredLabel } from "@/components/dashboard/required-label";
import { AsyncSearchSelect } from "@/components/ui/async-search-select";
import { getCourses } from "@/lib/api/courses";
import { getCurricula } from "@/lib/api/curriculums";
import { getAcademicYears } from "@/lib/api/academic-years";
import { getAcademicSessions } from "@/lib/api/academic-sessions";
import {
  createCourseFeeAssignment,
  updateCourseFeeAssignment,
  getFeeStructureOptions,
  type CourseFeeAssignment,
} from "@/lib/api/fees";
import {
  courseFeeAssignmentSchema,
  type CourseFeeAssignmentValues,
} from "@/schemas/course-fee-assignment-schema";

interface CourseFeeAssignmentFormProps {
  assignment?: CourseFeeAssignment;
  onSuccess?: (assignment: CourseFeeAssignment) => void;
  onCancel?: () => void;
}

export function CourseFeeAssignmentForm({
  assignment,
  onSuccess,
  onCancel,
}: CourseFeeAssignmentFormProps) {
  const isEditing = !!assignment;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CourseFeeAssignmentValues>({
    resolver: zodResolver(courseFeeAssignmentSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      courseId: assignment ? String(assignment.courseId) : "",
      curriculumId: assignment ? String(assignment.curriculumId) : "",
      academicYearId: assignment ? String(assignment.academicYearId) : "",
      academicSessionId: assignment ? String(assignment.academicSessionId) : "",
      feeStructureId: assignment ? String(assignment.feeStructureId) : "",
      effectiveFrom: assignment?.effectiveFrom?.slice(0, 10) ?? "",
      effectiveTo: assignment?.effectiveTo?.slice(0, 10) ?? "",
      remarks: assignment?.remarks ?? "",
      status: assignment?.status ?? "ACTIVE",
    },
  });

  const fetchCourseOptions = useCallback(
    (search: string) =>
      getCourses({ page: 1, limit: 10, search }).then((response) =>
        response.items.map((course) => ({
          id: course.id,
          label: `${course.code} - ${course.name}`,
        }))
      ),
    []
  );

  const fetchCurriculumOptions = useCallback(
    (search: string) =>
      getCurricula(1, 10, search).then((response) =>
        response.items.map((curriculum) => ({
          id: curriculum.id,
          label: curriculum.cycleName,
        }))
      ),
    []
  );

  const fetchYearOptions = useCallback(
    (search: string) =>
      getAcademicYears({ page: 1, limit: 10, search }).then((response) =>
        response.items.map((year) => ({ id: year.id, label: year.name }))
      ),
    []
  );

  const fetchSessionOptions = useCallback(
    (search: string) =>
      getAcademicSessions({ page: 1, limit: 10, search }).then((response) =>
        response.items.map((session) => ({
          id: session.id,
          label: session.name,
        }))
      ),
    []
  );

  const fetchFeeStructureOptions = useCallback(
    (search: string) => getFeeStructureOptions(search),
    []
  );

  async function onSubmit(values: CourseFeeAssignmentValues) {
    setIsSubmitting(true);
    const base = {
      feeStructureId: Number(values.feeStructureId),
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo || undefined,
      remarks: values.remarks?.trim() || undefined,
      status: values.status,
    };

    try {
      const result = isEditing
        ? await updateCourseFeeAssignment(assignment.id, base)
        : await createCourseFeeAssignment({
            ...base,
            courseId: Number(values.courseId),
            curriculumId: Number(values.curriculumId),
            academicYearId: Number(values.academicYearId),
            academicSessionId: Number(values.academicSessionId),
          });
      toast.success(
        isEditing
          ? "Course fee assignment updated successfully"
          : "Course fee assignment created successfully"
      );
      form.reset();
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          (err.response.data as { message?: string })?.message ??
            "An active assignment already exists for this context",
          { duration: 6000 }
        );
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField
            control={form.control}
            name="courseId"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Course</RequiredLabel>
                <FormControl>
                  <AsyncSearchSelect
                    value={field.value || undefined}
                    onValueChange={(next) => field.onChange(next ?? "")}
                    getOptions={fetchCourseOptions}
                    selectedLabel={
                      assignment
                        ? `${assignment.courseCode} - ${assignment.courseName}`
                        : undefined
                    }
                    placeholder="Select a course"
                    searchPlaceholder="Search by code or name..."
                    disabled={isSubmitting || isEditing}
                    minChars={1}
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
                    value={field.value || undefined}
                    onValueChange={(next) => field.onChange(next ?? "")}
                    getOptions={fetchCurriculumOptions}
                    selectedLabel={assignment?.curriculumName}
                    placeholder="Select a curriculum"
                    searchPlaceholder="Search by cycle name..."
                    disabled={isSubmitting || isEditing}
                    minChars={1}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="academicYearId"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Academic Year</RequiredLabel>
                <FormControl>
                  <AsyncSearchSelect
                    value={field.value || undefined}
                    onValueChange={(next) => field.onChange(next ?? "")}
                    getOptions={fetchYearOptions}
                    selectedLabel={assignment?.academicYearName}
                    placeholder="Select an academic year"
                    searchPlaceholder="Search by year name..."
                    disabled={isSubmitting || isEditing}
                    minChars={1}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="academicSessionId"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Academic Session</RequiredLabel>
                <FormControl>
                  <AsyncSearchSelect
                    value={field.value || undefined}
                    onValueChange={(next) => field.onChange(next ?? "")}
                    getOptions={fetchSessionOptions}
                    selectedLabel={assignment?.academicSessionName}
                    placeholder="Select an academic session"
                    searchPlaceholder="Search by session name..."
                    disabled={isSubmitting || isEditing}
                    minChars={1}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="feeStructureId"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Fee Structure</RequiredLabel>
                <FormControl>
                  <AsyncSearchSelect
                    value={field.value || undefined}
                    onValueChange={(next) => field.onChange(next ?? "")}
                    getOptions={fetchFeeStructureOptions}
                    selectedLabel={assignment?.feeStructureName}
                    placeholder="Select a fee structure"
                    searchPlaceholder="Search by fee name (min 2 chars)..."
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="effectiveFrom"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Effective From</RequiredLabel>
                <FormControl>
                  <Input type="date" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effectiveTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective To</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any notes about this assignment"
                  disabled={isSubmitting}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2 pt-2">
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
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Assignment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
