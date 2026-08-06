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
  createLectureRoom,
  updateLectureRoom,
  type LectureRoom,
} from "@/lib/api/lecture-rooms";
import {
  lectureRoomSchema,
  type LectureRoomValues,
} from "@/schemas/lecture-room-schema";

interface LectureRoomFormProps {
  room?: LectureRoom;
  onSuccess?: (room: LectureRoom) => void;
  onCancel?: () => void;
}

export function LectureRoomForm({
  room,
  onSuccess,
  onCancel,
}: LectureRoomFormProps) {
  const isEditing = !!room;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LectureRoomValues>({
    resolver: zodResolver(lectureRoomSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      name: room?.name ?? "",
      code: room?.code ?? "",
      capacity:
        room?.capacity !== null && room?.capacity !== undefined
          ? String(room.capacity)
          : "",
      location: room?.location ?? "",
      description: room?.description ?? "",
      isActive: room?.isActive ?? true,
    },
  });

  async function onSubmit(values: LectureRoomValues) {
    setIsSubmitting(true);
    const payload = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      capacity: values.capacity ? Number(values.capacity) : undefined,
      location: values.location?.trim() || undefined,
      description: values.description?.trim() || undefined,
      isActive: values.isActive,
    };

    try {
      const result = isEditing
        ? await updateLectureRoom(room.id, payload)
        : await createLectureRoom(payload);
      toast.success(
        isEditing ? "Room updated successfully" : "Room created successfully"
      );
      onSuccess?.(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        form.setError("code", {
          message:
            (err.response.data as { message?: string })?.message ??
            "A room with this name or code already exists",
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Room Name</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Lecture Hall A"
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
            name="code"
            render={({ field }) => (
              <FormItem>
                <RequiredLabel>Room Code</RequiredLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. LHA-01"
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
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
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
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Block B, Ground Floor"
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
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2 xl:col-span-3">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Room facilities, notes..."
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
                : "Create Room"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
