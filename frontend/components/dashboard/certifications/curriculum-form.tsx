"use client"

import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  createCurriculum,
  updateCurriculum,
  toggleCurriculumActive,
  type Curriculum,
} from "@/lib/api/curriculums";
import { getAuthorityOptions } from "@/lib/api/certifications";
import { curriculumSchema, type CurriculumValues } from "@/schemas/curriculum-schema";

interface CurriculumFormProps {
  curriculum?: Curriculum;
  /** When provided the authority is pre-selected and locked (read-only). */
  presetAuthority?: { id: number; name: string } | null;
  onSuccess?: (curriculum: Curriculum) => void;
  onCancel?: () => void;
}

export function CurriculumForm({
  curriculum,
  presetAuthority,
  onSuccess,
  onCancel,
}: CurriculumFormProps) {
  const [current, setCurrent] = useState(curriculum);
  const isEditing = !!current;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const lockedAuthority =
    presetAuthority ??
    (current
      ? {
          id: current.certificationAuthorityId,
          name:
            `${current.certificationAuthorityCode} ${current.certificationAuthorityName}`.trim() ||
            current.certificationAuthorityName ||
            "",
        }
      : null);

  const selectedAuthorityLabel = current
    ? `${current.certificationAuthorityCode} ${current.certificationAuthorityName}`.trim()
    : undefined;

  const fetchAuthorityOptions = useCallback(
    (search: string) => getAuthorityOptions(search),
    []
  );

  const form = useForm<CurriculumValues>({
    resolver: zodResolver(curriculumSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      certificationAuthorityId: lockedAuthority
        ? String(lockedAuthority.id)
        : current?.certificationAuthorityId
          ? String(current.certificationAuthorityId)
          : "",
      cycleName: current?.cycleName ?? "",
    },
  });

  function formatDate(value: string | null | undefined): string {
    if (!value) return "Not started";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Not started"
      : date.toISOString().slice(0, 10);
  }

  async function handleToggle() {
    if (!current) return;
    setIsToggling(true);
    try {
      const updated = await toggleCurriculumActive(current.id);
      setCurrent(updated);
      toast.success(
        updated.isActive
          ? "Curriculum started"
          : "Curriculum ended"
      );
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsToggling(false);
    }
  }

  async function onSubmit(values: CurriculumValues) {
    setIsSubmitting(true);
    const payload = {
      certificationAuthorityId: Number(values.certificationAuthorityId),
      cycleName: values.cycleName.trim(),
    };

    try {
      const result = isEditing
        ? await updateCurriculum(current.id, payload)
        : await createCurriculum(payload);
      toast.success(
        isEditing
          ? "Curriculum updated successfully"
          : "Curriculum created successfully"
      );
      form.reset();
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("cycleName", {
          message:
            (err.response.data as { message?: string })?.message ??
            "A curriculum cycle with this name already exists",
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
                    placeholder="Select a certification authority"
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
          name="cycleName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cycle Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Cycle 1, Cycle 2, Cycle 3"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEditing && (
          <div className="rounded-lg border p-4 md:col-span-2 xl:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <FormLabel>Lifecycle</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Start and end the curriculum cycle from here.
                </p>
              </div>
              <Button
                type="button"
                variant={current?.isActive ? "destructive" : "default"}
                disabled={isToggling}
                onClick={handleToggle}
              >
                {isToggling && <Loader2 className="animate-spin" />}
                {current?.isActive ? "End Curriculum" : "Start Curriculum"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel>Start Date</FormLabel>
                <Input value={formatDate(current?.startedAt)} disabled readOnly />
              </div>
              <div>
                <FormLabel>End Date</FormLabel>
                <Input value={formatDate(current?.endedAt)} disabled readOnly />
              </div>
            </div>
          </div>
        )}

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
                : "Create Curriculum"}
          </Button>
        </div>
      </form>
    </Form>
  );
}