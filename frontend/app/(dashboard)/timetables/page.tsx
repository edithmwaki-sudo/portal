"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getAcademicSessions,
  type AcademicSession,
} from "@/lib/api/academic-sessions";
import {
  getTimetableEntries,
  getTimetableTrainers,
  getAvailableUnits,
  createTimetableEntry,
  deleteTimetableEntry,
  type TimetableEntry,
  type TimetableTrainer,
  type TimetableUnit,
} from "@/lib/api/timetables";
import { getLectureRooms, type LectureRoom } from "@/lib/api/lecture-rooms";
import {
  DAY_LABELS,
  DAY_LABELS_SHORT,
  timetableEntrySchema,
  type TimetableEntryValues,
} from "@/schemas/timetable-schema";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const TIME_SLOTS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export default function TimetablesPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canView = hasAnyPermission(permissions, ["timetable.view", "timetable.my"]);
  const canAdd = hasAnyPermission(permissions, ["timetable.add"]);
  const canDelete = hasAnyPermission(permissions, ["timetable.delete"]);

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [trainers, setTrainers] = useState<TimetableTrainer[]>([]);
  const [units, setUnits] = useState<TimetableUnit[]>([]);
  const [rooms, setRooms] = useState<LectureRoom[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<TimetableEntryValues, any, TimetableEntryValues>({
    resolver: zodResolver(timetableEntrySchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      unitId: undefined as unknown as number,
      trainerStaffId: undefined as unknown as number,
      lectureRoomId: undefined as unknown as number,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "10:00",
      type: "lecture",
    },
  });

  useEffect(() => {
    if (!permissionsLoading && canView) {
      getAcademicSessions({ page: 1, limit: 100 })
        .then((data) => {
          setSessions(data.items);
          setSessionId((current) => {
            if (current && data.items.some((item) => item.id === current)) {
              return current;
            }
            const active = data.items.find((item) => item.isActive);
            return active?.id ?? data.items[0]?.id ?? null;
          });
        })
        .catch(() => undefined);
    }
  }, [permissionsLoading, canView]);

  useEffect(() => {
    if (!sessionId) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTimetableEntries(sessionId)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the timetable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, dialogOpen]);

  useEffect(() => {
    if (canAdd) {
      getTimetableTrainers()
        .then(setTrainers)
        .catch(() => undefined);
      getLectureRooms({ all: true })
        .then((data) => setRooms(data.items.filter((room) => room.isActive)))
        .catch(() => undefined);
    }
  }, [canAdd]);

  if (!permissionsLoading && !canView) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view timetables.
      </p>
    );
  }

  async function openCreateDialog() {
    if (!sessionId) return;
    setDialogOpen(true);
    form.reset({
      unitId: undefined as unknown as number,
      trainerStaffId: undefined as unknown as number,
      lectureRoomId: undefined as unknown as number,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "10:00",
      type: "lecture",
    });
    try {
      const available = await getAvailableUnits(sessionId);
      setUnits(available);
    } catch {
      setUnits([]);
    }
  }

  async function handleSubmit(values: TimetableEntryValues) {
    if (!sessionId) return;
    setSaving(true);
    try {
      await createTimetableEntry({
        academicSessionId: sessionId,
        unitId: values.unitId,
        trainerStaffId: values.trainerStaffId,
        lectureRoomId: values.lectureRoomId,
        dayOfWeek: values.dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        type: values.type || "lecture",
      });
      toast.success("Timetable entry added");
      setDialogOpen(false);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTimetableEntry(deleteTarget.id);
      toast.success("Timetable entry deleted");
      setDeleteTarget(null);
      setEntries((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete the entry."
      );
    } finally {
      setDeleting(false);
    }
  }

  const byDay = useMemo(() => {
    const map: Record<number, TimetableEntry[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const entry of entries) {
      (map[entry.dayOfWeek] ??= []).push(entry);
    }
    for (const day of Object.values(map)) {
      day.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    }
    return map;
  }, [entries]);

  const selectedSession = sessions.find((item) => item.id === sessionId) ?? null;

  return (
    <>
      <PageToolbar
        title="Timetables"
        description={
          selectedSession
            ? `${selectedSession.code} ${selectedSession.name}`.trim()
            : "Weekly class timetable."
        }
        primaryActions={
          canAdd && sessionId
            ? [
                {
                  label: "Add Entry",
                  icon: Plus,
                  onClick: openCreateDialog,
                },
              ]
            : undefined
        }
      />
      <div className="mx-[50px] mb-[30px] space-y-[30px]">
        <div className="overflow-hidden rounded-lg bg-white shadow-lg shadow-black/5">
          <div className="border-b px-4 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full max-w-sm space-y-1.5">
                <Label>Academic Session</Label>
                <Select
                  value={sessionId ? String(sessionId) : ""}
                  onValueChange={(value) => setSessionId(Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={String(session.id)}>
                        {session.code} — {session.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              Loading timetable...
            </p>
          ) : error ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : entries.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              No timetable entries for this session yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-r px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Time
                    </th>
                    {DAY_LABELS.map((label) => (
                      <th
                        key={label}
                        className="border-b border-r px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot, index) => {
                    const nextSlot = TIME_SLOTS[index + 1];
                    const startMin = toMinutes(slot);
                    return (
                      <tr key={slot}>
                        <td className="whitespace-nowrap border-b border-r px-3 py-2 align-top text-xs font-medium text-muted-foreground">
                          {slot}
                        </td>
                        {DAY_LABELS.map((_, dayIndex) => {
                          const dayEntries = byDay[dayIndex] ?? [];
                          const cellEntries = dayEntries.filter((entry) => {
                            const entryStart = toMinutes(entry.startTime);
                            return (
                              entryStart >= startMin &&
                              (nextSlot ? entryStart < toMinutes(nextSlot) : true)
                            );
                          });
                          const columnMatches = dayEntries.some((entry) => {
                            const entryStart = toMinutes(entry.startTime);
                            const entryEnd = toMinutes(entry.endTime);
                            return (
                              entryStart < startMin + 60 && entryEnd > startMin
                            );
                          });
                          return (
                            <td
                              key={`${slot}-${dayIndex}`}
                              className={cn(
                                "border-b border-r px-2 py-2 align-top",
                                cellEntries.length > 0 && "bg-primary/5"
                              )}
                            >
                              {cellEntries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="mb-1 rounded border-l-2 px-2 py-1"
                                  style={{
                                    borderColor: "#3b82f6",
                                    backgroundColor: "#eff6ff",
                                  }}
                                >
                                  <p className="text-xs font-medium">
                                    {entry.unit?.code ?? "—"}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {entry.startTime}–{entry.endTime}
                                    {" · "}
                                    {entry.room?.name ?? "No room"}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {entry.trainer?.name ?? "No trainer"}
                                  </p>
                                  {canDelete && (
                                    <button
                                      className="mt-0.5 text-[11px] text-red-600 hover:underline"
                                      onClick={() => setDeleteTarget(entry)}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              ))}
                              {columnMatches && cellEntries.length === 0 && (
                                <span className="text-[11px] text-muted-foreground/70">
                                  class in progress
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {entries.length > 0 && (
          <div className="overflow-hidden rounded-lg bg-white shadow-lg shadow-black/5">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">All Entries</h2>
            </div>
            <div className="divide-y">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-6 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {entry.unit?.name ?? "Unit"}
                      <span className="text-muted-foreground">
                        {" · "}
                        {DAY_LABELS_SHORT[entry.dayOfWeek]}{" "}
                        {entry.startTime}–{entry.endTime}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.trainer?.name ?? "No trainer"}
                      {" · "}
                      {entry.room?.name ?? "No room"}
                    </p>
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(entry)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Timetable Entry</DialogTitle>
            <DialogDescription>
              Schedule a class session. Conflicts with rooms or trainers are
              blocked.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
          >
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select
                value={form.watch("unitId") ? String(form.watch("unitId")) : ""}
                onValueChange={(value) =>
                  form.setValue("unitId", Number(value), { shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={String(unit.id)}>
                      {unit.code} — {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.unitId && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.unitId.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Trainer</Label>
              <Select
                value={
                  form.watch("trainerStaffId")
                    ? String(form.watch("trainerStaffId"))
                    : ""
                }
                onValueChange={(value) =>
                  form.setValue("trainerStaffId", Number(value), {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a trainer" />
                </SelectTrigger>
                <SelectContent>
                  {trainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={String(trainer.id)}>
                      {trainer.name}
                      {trainer.employeeNumber
                        ? ` (${trainer.employeeNumber})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.trainerStaffId && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.trainerStaffId.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Select
                value={
                  form.watch("lectureRoomId")
                    ? String(form.watch("lectureRoomId"))
                    : ""
                }
                onValueChange={(value) =>
                  form.setValue("lectureRoomId", Number(value), {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {room.name}
                      {room.code ? ` (${room.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.lectureRoomId && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.lectureRoomId.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select
                value={String(form.watch("dayOfWeek"))}
                onValueChange={(value) =>
                  form.setValue("dayOfWeek", Number(value), {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, index) => (
                    <SelectItem key={label} value={String(index)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  {...form.register("startTime")}
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.startTime.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input type="time" {...form.register("endTime")} />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.endTime.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {saving ? "Adding..." : "Add Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete timetable entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the scheduled class. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
