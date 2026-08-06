"use client"

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
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
import {
  createFeeStructure,
  updateFeeStructure,
  type FeeStructure,
} from "@/lib/api/fees";
import {
  feeStructureSchema,
  type FeeStructureValues,
} from "@/schemas/fee-structure-schema";

interface FeeStructureFormProps {
  structure?: FeeStructure;
  onSuccess?: (structure: FeeStructure) => void;
  onCancel?: () => void;
}

export function FeeStructureForm({
  structure,
  onSuccess,
  onCancel,
}: FeeStructureFormProps) {
  const isEditing = !!structure;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeeStructureValues>({
    resolver: zodResolver(feeStructureSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      feeName: structure?.feeName ?? "",
      description: structure?.description ?? "",
      startDate: structure?.startDate?.slice(0, 10) ?? "",
      endDate: structure?.endDate?.slice(0, 10) ?? "",
      status: structure?.status ?? "ACTIVE",
      items:
        structure?.items?.length
          ? structure.items.map((item) => ({
              itemName: item.itemName,
              amount: String(item.amount),
            }))
          : [{ itemName: "", amount: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  async function onSubmit(values: FeeStructureValues) {
    setIsSubmitting(true);
    const payload = {
      feeName: values.feeName.trim(),
      description: values.description?.trim() || undefined,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      status: values.status,
      items: values.items.map((item, index) => ({
        itemName: item.itemName.trim(),
        amount: Number(item.amount),
        displayOrder: index,
      })),
    };

    try {
      const result = isEditing
        ? await updateFeeStructure(structure.id, payload)
        : await createFeeStructure(payload);
      toast.success(
        isEditing
          ? "Fee structure updated successfully"
          : "Fee structure created successfully"
      );
      form.reset();
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("feeName", {
          message:
            (err.response.data as { message?: string })?.message ??
            "A fee structure with this name already exists",
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            control={form.control}
            name="feeName"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Fee Name</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Academic Year Fees"
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
                <RequiredLabel>Start Date</RequiredLabel>
                <FormControl>
                  <Input
                    type="date"
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What does this fee structure cover?"
                  disabled={isSubmitting}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Fee Items</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => append({ itemName: "", amount: "" })}
            >
              <Plus />
              Add Fee Item
            </Button>
          </div>

          <div className="grid gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.itemName`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="e.g. Tuition"
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
                  name={`items.${index}.amount`}
                  render={({ field }) => (
                    <FormItem className="w-48">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Amount"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={isSubmitting || fields.length === 1}
                  aria-label={`Remove fee item ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

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
                : "Create Fee Structure"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
