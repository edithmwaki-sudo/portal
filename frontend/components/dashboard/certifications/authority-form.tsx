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
  createCertificationAuthority,
  updateCertificationAuthority,
  type CertificationAuthority,
} from "@/lib/api/certifications";
import {
  certificationAuthoritySchema,
  type CertificationAuthorityValues,
} from "@/schemas/certification-schema";

interface AuthorityFormProps {
  authority?: CertificationAuthority;
  onSuccess?: (authority: CertificationAuthority) => void;
  onCancel?: () => void;
}

export function AuthorityForm({
  authority,
  onSuccess,
  onCancel,
}: AuthorityFormProps) {
  const isEditing = !!authority;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CertificationAuthorityValues>({
    resolver: zodResolver(certificationAuthoritySchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      code: authority?.code ?? "",
      name: authority?.name ?? "",
      description: authority?.description ?? "",
      isActive: authority?.isActive ?? true,
    },
  });

  async function onSubmit(values: CertificationAuthorityValues) {
    setIsSubmitting(true);
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      isActive: values.isActive,
    };

    try {
      const result = isEditing
        ? await updateCertificationAuthority(authority.id, payload)
        : await createCertificationAuthority(payload);
      toast.success(
        isEditing
          ? "Certification authority updated successfully"
          : "Certification authority created successfully"
      );
      form.reset();
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("code", {
          message:
            (err.response.data as { message?: string })?.message ??
            "A certification authority with this code already exists",
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
                    placeholder="e.g. KNEC"
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
                    placeholder="e.g. Kenya National Examination Council"
                    disabled={isSubmitting}
                    {...field}
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
                  placeholder="What is this certification authority responsible for?"
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
                  Inactive authorities are hidden from selection.
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
                : "Create Authority"}
          </Button>
        </div>
      </form>
    </Form>
  );
}