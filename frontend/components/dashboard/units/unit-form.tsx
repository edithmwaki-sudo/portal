"use client"

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequiredLabel } from "@/components/dashboard/required-label";
import {
  createUnit,
  updateUnit,
  type Unit,
} from "@/lib/api/units";
import type { Course } from "@/lib/api/courses";
import { unitSchema, type UnitValues } from "@/schemas/unit-schema";

const FULL_WIDTH = "md:col-span-2 xl:col-span-3";

interface UnitFormProps {
  unit?: Unit;
  /** The course context the unit belongs to (read-only, drives the payload). */
  course: Course;
  /** Preferred curriculum version; falls back to the course's active cycle. */
  initialCurriculumId?: number;
  onSuccess?: (unit: Unit) => void;
  onCancel?: () => void;
}

export function UnitForm({
  unit,
  course,
  initialCurriculumId,
  onSuccess,
  onCancel,
}: UnitFormProps) {
  const isEditing = !!unit;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [curriculumId, setCurriculumId] = useState<number | undefined>(() => {
    const curricula = course.curricula;
    const fromInitial =
      initialCurriculumId &&
      curricula.some((item) => item.id === initialCurriculumId)
        ? initialCurriculumId
        : undefined;
    return (
      fromInitial ??
      curricula.find((item) => item.isActive)?.id ??
      curricula[0]?.id
    );
  });

  const form = useForm<UnitValues>({
    resolver: zodResolver(unitSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      code: unit?.code ?? "",
      name: unit?.name ?? "",
      modulesTaught:
        unit?.modulesTaught !== null && unit?.modulesTaught !== undefined
          ? String(unit.modulesTaught)
          : "",
      taughtHours:
        unit?.taughtHours !== null && unit?.taughtHours !== undefined
          ? String(unit.taughtHours)
          : "",
      creditFactor:
        unit?.creditFactor !== null && unit?.creditFactor !== undefined
          ? String(unit.creditFactor)
          : "",
      description: unit?.description ?? "",
      isActive: unit?.isActive ?? true,
    },
  });

  async function onSubmit(values: UnitValues) {
    if (!curriculumId) {
      return;
    }
    setIsSubmitting(true);
    const payload = {
      courseId: course.id,
      curriculumId,
      code: values.code.trim(),
      name: values.name.trim(),
      modulesTaught: values.modulesTaught ? Number(values.modulesTaught) : undefined,
      taughtHours: values.taughtHours ? Number(values.taughtHours) : undefined,
      creditFactor: values.creditFactor ? Number(values.creditFactor) : undefined,
      description: values.description?.trim() || undefined,
      isActive: values.isActive,
    };

    try {
      const result = isEditing
        ? await updateUnit(unit.id, payload)
        : await createUnit(payload);
      toast.success(
        isEditing ? "Unit updated successfully" : "Unit created successfully"
      );
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("code", {
          message:
            (err.response.data as { message?: string })?.message ??
            "A unit with this code already exists for this course and curriculum",
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
        className="grid gap-6"
      >
        <section className="rounded-lg border bg-muted/30 p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Course Context
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ContextValue
              label="Certification Authority"
              value={
                course.certificationAuthorityName
                  ? `${course.certificationAuthorityCode ?? ""} ${course.certificationAuthorityName}`.trim()
                  : null
              }
            />
            <ContextValue
              label="Course"
              value={course.name ? `${course.code} ${course.name}`.trim() : course.code}
            />
            <ContextValue
              label="Certification Level"
              value={course.certificationLevelName}
            />
            <div className="space-y-1.5">
              <FormLabel>Curriculum Version</FormLabel>
              {course.curricula.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No linked curriculum
                </p>
              ) : (
                <Select
                  value={curriculumId ? String(curriculumId) : ""}
                  onValueChange={(value) => setCurriculumId(Number(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a curriculum" />
                  </SelectTrigger>
                  <SelectContent>
                    {course.curricula.map((item) => (
                      <SelectItem
                        key={item.courseCurriculumId}
                        value={String(item.id)}
                      >
                        {item.cycleName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Unit Details
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Unit Code</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. U-ICT-L6-01"
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
                  <RequiredLabel>Unit Name</RequiredLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Introduction to ICT"
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
              name="modulesTaught"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Offered</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      placeholder="e.g. 4"
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
              name="taughtHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taught Hours</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      placeholder="e.g. 120"
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
              name="creditFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Factor</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      placeholder="e.g. 1.00"
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
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? "active" : "inactive"}
                      onValueChange={(value) => field.onChange(value === "active")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
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
                      placeholder="Brief description of the unit..."
                      disabled={isSubmitting}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !curriculumId}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Unit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ContextValue({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1.5">
      <FormLabel>{label}</FormLabel>
      <p className="min-h-9 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium">
        {value ?? <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}
