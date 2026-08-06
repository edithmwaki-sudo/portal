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
import { Switch } from "@/components/ui/switch";
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
  createCertificationLevel,
  updateCertificationLevel,
  getAuthorityOptions,
  type CertificationLevel,
} from "@/lib/api/certifications";
import {
  certificationLevelSchema,
  type CertificationLevelValues,
} from "@/schemas/certification-schema";

interface LevelFormProps {
  level?: CertificationLevel;
  /** When provided the authority is pre-selected and locked (read-only). */
  presetAuthority?: { id: number; name: string } | null;
  onSuccess?: (level: CertificationLevel) => void;
  onCancel?: () => void;
}

export function LevelForm({
  level,
  presetAuthority,
  onSuccess,
  onCancel,
}: LevelFormProps) {
  const isEditing = !!level;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockedAuthority = presetAuthority ?? null;

  const selectedAuthorityLabel = level?.certificationAuthorityCode
    ? `${level.certificationAuthorityCode} ${level.certificationAuthorityName}`.trim()
    : level?.certificationAuthorityName ?? undefined;

  const fetchAuthorityOptions = useCallback(
    (search: string) => getAuthorityOptions(search),
    []
  );

  const form = useForm<CertificationLevelValues>({
    resolver: zodResolver(certificationLevelSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      certificationAuthorityId: lockedAuthority
        ? String(lockedAuthority.id)
        : level?.certificationAuthorityId
          ? String(level.certificationAuthorityId)
          : "",
      code: level?.code ?? "",
      name: level?.name ?? "",
      entryGrade: level?.entryGrade ?? "",
      description: level?.description ?? "",
      isActive: level?.isActive ?? true,
    },
  });

  async function onSubmit(values: CertificationLevelValues) {
    setIsSubmitting(true);
    const payload = {
      certificationAuthorityId: Number(values.certificationAuthorityId),
      code: values.code.trim(),
      name: values.name.trim(),
      entryGrade: values.entryGrade?.trim() || undefined,
      description: values.description?.trim() || undefined,
      isActive: values.isActive,
    };

    try {
      const result = isEditing
        ? await updateCertificationLevel(level.id, payload)
        : await createCertificationLevel(payload);
      toast.success(
        isEditing
          ? "Certification level updated successfully"
          : "Certification level created successfully"
      );
      form.reset();
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("code", {
          message:
            (err.response.data as { message?: string })?.message ??
            "A level with this code already exists for this authority",
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
            name="certificationAuthorityId"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Certification Authority</RequiredLabel>
                <FormControl>
                  {lockedAuthority ? (
                    <Input
                      value={lockedAuthority.name}
                      disabled
                      readOnly
                      className="disabled:cursor-default"
                    />
                  ) : (
                    <AsyncSearchSelect
                      value={field.value || undefined}
                      onValueChange={(next) => field.onChange(next ?? "")}
                      getOptions={fetchAuthorityOptions}
                      selectedLabel={selectedAuthorityLabel}
                      placeholder="Select an authority"
                      searchPlaceholder="Search by code or name..."
                      disabled={isSubmitting}
                      minChars={2}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Code</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. ART"
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
                    placeholder="e.g. Artisan"
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
            name="entryGrade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Grade</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. KCSE D+ (optional)"
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
                  placeholder="Describe this certification level (optional)"
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
                  Inactive levels are hidden from selection.
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
                : "Create Level"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
