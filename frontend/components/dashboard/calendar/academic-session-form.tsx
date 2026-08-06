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
  createAcademicSession,
  updateAcademicSession,
  type AcademicSession,
} from "@/lib/api/academic-sessions";
import {
  academicSessionSchema,
  type AcademicSessionValues,
} from "@/schemas/academic-session-schema";

interface AcademicSessionFormProps {
  session?: AcademicSession;
  /** Required when creating; ignored when editing. */
  academicYearId?: number;
  onSuccess?: (session: AcademicSession) => void;
  onCancel?: () => void;
}

export function AcademicSessionForm({
  session,
  academicYearId,
  onSuccess,
  onCancel,
}: AcademicSessionFormProps) {
  const isEditing = !!session;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AcademicSessionValues>({
    resolver: zodResolver(academicSessionSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      academicYearId: session?.academicYearId ?? academicYearId ?? 0,
      code: session?.code ?? "",
      name: session?.name ?? "",
      startDate: session?.startDate?.slice(0, 10) ?? "",
      endDate: session?.endDate?.slice(0, 10) ?? "",
      description: session?.description ?? "",
      isActive: session?.isActive ?? false,
    },
  });

  async function onSubmit(values: AcademicSessionValues) {
    if (isEditing) {
      setIsSubmitting(true);
      try {
        const result = await updateAcademicSession(session.id, {
          code: values.code.trim(),
          name: values.name.trim(),
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
          description: values.description?.trim() || undefined,
          isActive: values.isActive,
        });
        toast.success("Academic session updated successfully");
        onSuccess?.(result);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          form.setError("code", {
            message:
              (err.response.data as { message?: string })?.message ??
              "A session with this code already exists for the year",
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
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAcademicSession({
        academicYearId: values.academicYearId,
        code: values.code.trim(),
        name: values.name.trim(),
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        description: values.description?.trim() || undefined,
        isActive: values.isActive,
      });
      toast.success("Academic session created successfully");
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("code", {
          message:
            (err.response.data as { message?: string })?.message ??
            "A session with this code already exists for the year",
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
                <RequiredLabel>Session Code</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 2026-S1"
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
                <RequiredLabel>Session Name</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Semester One"
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
              name="academicYearId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Year</FormLabel>
                  <FormControl>
                    <Input value={String(field.value)} disabled readOnly />
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
                    placeholder="Optional notes about this session..."
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
                : "Create Session"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
