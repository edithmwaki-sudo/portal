"use client"

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { RequiredLabel } from "@/components/dashboard/required-label";
import { createRole, updateRole, type RoleResponse } from "@/lib/api/roles";
import {
  createRoleSchema,
  type CreateRoleValues,
} from "@/schemas/role-schema";

interface RoleFormProps {
  /** When provided, the form updates that role (by id) instead of creating. */
  roleId?: number;
  /** Initial values for edit — the dialog reuses this same form. */
  initialValues?: Partial<CreateRoleValues>;
  onSuccess?: (role: RoleResponse) => void;
  onCancel?: () => void;
}

export function RoleForm({
  roleId,
  initialValues,
  onSuccess,
  onCancel,
}: RoleFormProps) {
  const isEditing = typeof roleId === "number";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateRoleValues>({
    resolver: zodResolver(createRoleSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name: initialValues?.name ?? "" },
  });

  async function onSubmit(values: CreateRoleValues) {
    setIsSubmitting(true);
    try {
      const role = isEditing
        ? await updateRole(roleId, values)
        : await createRole(values);
      toast.success(isEditing ? "Role updated successfully" : "Role created successfully");
      form.reset();
      onSuccess?.(role);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("name", {
          message:
            err.response.data?.message ??
            "A role with this name already exists",
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
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <RequiredLabel>Name</RequiredLabel>
              <FormControl>
                <Input
                  placeholder="e.g. hostel_warden"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-end gap-2 pt-2 md:col-span-2 xl:col-span-3">
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
                : "Create Role"}
          </Button>
        </div>
      </form>
    </Form>
  );
}