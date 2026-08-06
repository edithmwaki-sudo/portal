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
  createAcademicYear,
  updateAcademicYear,
  type AcademicYear,
} from "@/lib/api/academic-years";
import {
  academicYearSchema,
  type AcademicYearValues,
} from "@/schemas/academic-year-schema";

interface AcademicYearFormProps {
  year?: AcademicYear;
  onSuccess?: (year: AcademicYear) => void;
  onCancel?: () => void;
}

export function AcademicYearForm({
  year,
  onSuccess,
  onCancel,
}: AcademicYearFormProps) {
  const isEditing = !!year;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AcademicYearValues>({
    resolver: zodResolver(academicYearSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      code: year?.code ?? "",
      name: year?.name ?? "",
      startDate: year?.startDate?.slice(0, 10) ?? "",
      endDate: year?.endDate?.slice(0, 10) ?? "",
      description: year?.description ?? "",
      sessionsPerYear: isEditing ? undefined : "3",
      isActive: year?.isActive ?? false,
    },
  });

  async function onSubmit(values: AcademicYearValues) {
    setIsSubmitting(true);
    try {
      const result = isEditing
        ? await updateAcademicYear(year.id, {
            code: values.code.trim(),
            name: values.name.trim(),
            startDate: values.startDate || undefined,
            endDate: values.endDate || undefined,
            description: values.description?.trim() || undefined,
            isActive: values.isActive,
          })
        : await createAcademicYear({
            code: values.code.trim(),
            name: values.name.trim(),
            startDate: values.startDate || undefined,
            endDate: values.endDate || undefined,
            description: values.description?.trim() || undefined,
            sessionsPerYear: values.sessionsPerYear
              ? Number(values.sessionsPerYear)
              : undefined,
            isActive: values.isActive,
          });
      toast.success(
        isEditing
          ? "Academic year updated successfully"
          : "Academic year created successfully"
      );
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("code", {
          message:
            (err.response.data as { message?: string })?.message ??
            "An academic year with this code already exists",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Year Code</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 2026"
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
                <RequiredLabel>Year Name</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Academic Year 2026"
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
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isEditing && (
            <FormField
              control={form.control}
              name="sessionsPerYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sessions per Year</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? String(field.value) : "3"}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sessions per year" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            {count} session{count === 1 ? "" : "s"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select
                    value={field.value ? "active" : "inactive"}
                    onValueChange={(value) =>
                      field.onChange(value === "active")
                    }
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
              <FormItem className="md:col-span-2 xl:col-span-3">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional notes about this academic year..."
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

        <div className="flex items-center justify-end gap-2 pt-2">
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
                : "Create Academic Year"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
