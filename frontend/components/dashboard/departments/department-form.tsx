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
import { AsyncSearchSelect } from "@/components/ui/async-search-select";
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
  createDepartment,
  updateDepartment,
  getHeadOfDepartmentOptions,
  type Department,
} from "@/lib/api/departments";
import {
  departmentSchema,
  type DepartmentValues,
} from "@/schemas/department-schema";

interface DepartmentFormProps {
  department?: Department;
  onSuccess?: (department: Department) => void;
  onCancel?: () => void;
}

export function DepartmentForm({
  department,
  onSuccess,
  onCancel,
}: DepartmentFormProps) {
  const isEditing = !!department;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedHeadLabel = department?.headOfDepartmentEmployeeNumber
    ? `${department.headOfDepartmentEmployeeNumber} - ${department.headOfDepartmentName}`
    : department?.headOfDepartmentName ?? undefined;

  const form = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      code: department?.code ?? "",
      name: department?.name ?? "",
      headOfDepartmentId: department?.headOfDepartmentId
        ? String(department.headOfDepartmentId)
        : "",
      description: department?.description ?? "",
    },
  });

  const fetchHeadOptions = useCallback(
    (search: string) => getHeadOfDepartmentOptions(search),
    []
  );

  async function onSubmit(values: DepartmentValues) {
    setIsSubmitting(true);
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      headOfDepartmentId: values.headOfDepartmentId
        ? Number(values.headOfDepartmentId)
        : undefined,
      description: values.description?.trim() || undefined,
    };

    try {
      const result = isEditing
        ? await updateDepartment(department.id, payload)
        : await createDepartment(payload);
      toast.success(
        isEditing ? "Department updated successfully" : "Department created successfully"
      );
      form.reset();
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("code", {
          message:
            (err.response.data as { message?: string })?.message ??
            "A department with this code already exists",
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
            name="code"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Code</RequiredLabel>
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Name</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Information Technology"
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
          name="headOfDepartmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Head of Department</FormLabel>
              <FormControl>
                <AsyncSearchSelect
                  value={field.value || undefined}
                  onValueChange={(next) => field.onChange(next ?? "")}
                  getOptions={fetchHeadOptions}
                  selectedLabel={selectedHeadLabel}
                  placeholder="Select a staff member (optional)"
                  searchPlaceholder="Search by employee number or name..."
                  disabled={isSubmitting}
                  minChars={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What is this department responsible for?"
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
                : "Create Department"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
