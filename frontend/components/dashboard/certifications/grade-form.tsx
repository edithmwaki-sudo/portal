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
import { Switch } from "@/components/ui/switch";
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
  createCertificationGrade,
  updateCertificationGrade,
  type CertificationGrade,
} from "@/lib/api/certifications";
import {
  certificationGradeSchema,
  type CertificationGradeValues,
} from "@/schemas/certification-schema";

interface GradeFormProps {
  certificationAuthorityId: number;
  grade?: CertificationGrade;
  onSuccess?: (grade: CertificationGrade) => void;
  onCancel?: () => void;
}

export function GradeForm({
  certificationAuthorityId,
  grade,
  onSuccess,
  onCancel,
}: GradeFormProps) {
  const isEditing = !!grade;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CertificationGradeValues>({
    resolver: zodResolver(certificationGradeSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      grade: grade?.grade ?? "",
      gradeStart: grade?.gradeStart ?? undefined,
      gradeEnd: grade?.gradeEnd ?? undefined,
      remark: grade?.remark ?? "",
      isActive: grade?.isActive ?? true,
    },
  });

  async function onSubmit(values: CertificationGradeValues) {
    setIsSubmitting(true);
    const payload = {
      grade: values.grade.trim(),
      gradeStart: Number(values.gradeStart),
      gradeEnd: Number(values.gradeEnd),
      remark: values.remark?.trim() || undefined,
      isActive: values.isActive,
    };

    try {
      const result = isEditing
        ? await updateCertificationGrade(
            certificationAuthorityId,
            grade.id,
            payload
          )
        : await createCertificationGrade(certificationAuthorityId, payload);
      toast.success(
        isEditing
          ? "Grade updated successfully"
          : "Grade created successfully"
      );
      form.reset();
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("grade", {
          message:
            (err.response.data as { message?: string })?.message ??
            "This grade overlaps with an existing grade for this authority",
        });
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
            name="grade"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Grade</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. PASS"
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
            name="gradeStart"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Grade Start</RequiredLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="0"
                    disabled={isSubmitting}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value)
                      )
                    }
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gradeEnd"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Grade End</RequiredLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="100"
                    disabled={isSubmitting}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value)
                      )
                    }
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="remark"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remark</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any remark about this grade range (optional)"
                  disabled={isSubmitting}
                  rows={3}
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
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>Active</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Inactive grades are hidden from selection.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
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
                : "Create Grade"}
          </Button>
        </div>
      </form>
    </Form>
  );
}