"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getEventTypes,
  getSessionCalendar,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  generateCalendar,
  syncCalendarHolidays,
  type CalendarEvent,
  type CalendarEventType,
  type SessionCalendar,
} from "@/lib/api/calendar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function SessionCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = Number(searchParams.get("id")) || undefined;

  const { permissions, loading: permissionsLoading } = usePermissions();
  const canView = hasAnyPermission(permissions, ["calendar.view"]);
  const canAdd = hasAnyPermission(permissions, ["calendar.add"]);
  const canEdit = hasAnyPermission(permissions, ["calendar.edit"]);
  const canDelete = hasAnyPermission(permissions, ["calendar.delete"]);
  const canGenerate = hasAnyPermission(permissions, ["calendar.generate"]);

  const [session, setSession] = useState<SessionCalendar["session"] | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekends, setWeekends] = useState<SessionCalendar["weekends"]>([]);
  const [eventTypes, setEventTypes] = useState<CalendarEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [busy, setBusy] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({
    eventTypeId: "",
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const weekendKeys = useMemo(
    () => new Set(weekends.map((item) => dateKey(new Date(item.date)))),
    [weekends]
  );

  const load = useCallback(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    getSessionCalendar(sessionId)
      .then((data) => {
        setSession(data.session);
        setEvents(data.events);
        setWeekends(data.weekends);
      })
      .catch(() => setError("Failed to load the session calendar."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (!permissionsLoading && canView && sessionId) {
      load();
      getEventTypes()
        .then(setEventTypes)
        .catch(() => undefined);
    }
  }, [permissionsLoading, canView, sessionId, load]);

  if (!permissionsLoading && !canView) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view the calendar.
      </p>
    );
  }

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const result: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i += 1) result.push(null);
    for (let d = 1; d <= lastDay.getDate(); d += 1) {
      result.push(new Date(year, month, d));
    }
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      for (
        let day = new Date(start);
        day <= end;
        day.setDate(day.getDate() + 1)
      ) {
        const key = dateKey(day);
        const list = map.get(key) ?? [];
        list.push(event);
        map.set(key, list);
      }
    }
    map.forEach((list) =>
      list.sort((a, b) => a.startDate.localeCompare(b.startDate))
    );
    return map;
  }, [events]);

  function openCreateDialog(prefillDate?: string) {
    setEditing(null);
    setForm({
      eventTypeId: "",
      title: "",
      description: "",
      startDate: prefillDate ?? "",
      endDate: prefillDate ?? "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(event: CalendarEvent) {
    setEditing(event);
    setForm({
      eventTypeId: String(event.eventTypeId),
      title: event.title,
      description: event.description ?? "",
      startDate: event.startDate.slice(0, 10),
      endDate: event.endDate.slice(0, 10),
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!sessionId) return;
    setSaving(true);
    const payload = {
      eventTypeId: Number(form.eventTypeId),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
    };
    try {
      if (editing) {
        await updateCalendarEvent(sessionId, editing.id, payload);
        toast.success("Event updated successfully");
      } else {
        await createCalendarEvent(sessionId, payload);
        toast.success("Event created successfully");
      }
      setDialogOpen(false);
      load();
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
    if (!sessionId || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCalendarEvent(sessionId, deleteTarget.id);
      toast.success("Event deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete the event."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleGenerate() {
    if (!sessionId) return;
    setBusy(true);
    try {
      const result = await generateCalendar(sessionId);
      toast.success(`Generated ${result.synced} system events`);
      load();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to generate the calendar."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncHolidays() {
    if (!sessionId) return;
    setBusy(true);
    try {
      const result = await syncCalendarHolidays(sessionId);
      toast.success(`Synced ${result.synced} public holidays`);
      load();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to sync holidays."
      );
    } finally {
      setBusy(false);
    }
  }

  const eventTypeMap = useMemo(
    () => new Map(eventTypes.map((item) => [item.id, item])),
    [eventTypes]
  );

  return (
    <>
      <PageToolbar
        title={session?.name ?? "Session Calendar"}
        description={
          session?.startDate && session?.endDate
            ? `${session.startDate.slice(0, 10)} – ${session.endDate.slice(0, 10)}`
            : "Manage events for this academic session."
        }
        primaryActions={[
          {
            label: "Back",
            icon: ArrowLeft,
            href: "/calendar",
            variant: "outline",
          },
          ...(canAdd
            ? [
                {
                  label: "Add Event",
                  icon: Plus,
                  onClick: () => openCreateDialog(),
                },
              ]
            : []),
        ]}
      />
      <div className="mx-[50px] mb-[30px] space-y-[30px]">
        {canGenerate && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card px-6 py-4 shadow-lg shadow-black/5">
            <p className="text-sm text-muted-foreground">
              Generate system events (public holidays) for this session, or sync
              Kenyan public holidays from the Nager.Date API.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={busy || loading}
                onClick={handleSyncHolidays}
              >
                {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                Sync Holidays
              </Button>
              <Button disabled={busy || loading} onClick={handleGenerate}>
                {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                Generate
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">
              {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
                  )
                }
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                  )
                }
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              Loading calendar...
            </p>
          ) : error ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[70px] border-r border-b bg-muted/20 last:border-r-0"
                      />
                    );
                  }
                  const key = dateKey(day);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const isWeekend = weekendKeys.has(key);
                  const isToday = key === dateKey(new Date());
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex min-h-[70px] cursor-pointer flex-col border-r border-b p-1 last:border-r-0",
                        isWeekend && "bg-muted/50"
                      )}
                      onClick={() => canAdd && openCreateDialog(key)}
                    >
                      <span
                        className={cn(
                          "mb-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                          isToday
                            ? "bg-primary font-semibold text-primary-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {day.getDate()}
                      </span>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event) => {
                          const type = eventTypeMap.get(event.eventTypeId);
                          return (
                            <div
                              key={event.id}
                              className="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${type?.colorHex ?? "#64748b"}22`,
                                color: type?.colorHex ?? "#64748b",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canEdit && !event.isLocked) {
                                  openEditDialog(event);
                                }
                              }}
                            >
                              <span className="truncate">{event.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <span className="px-1 text-[10px] text-muted-foreground">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {events.length > 0 && (
          <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Events</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 px-4">S/NO</TableHead>
                  <TableHead className="px-4">Event Name</TableHead>
                  <TableHead className="px-4">Start Date</TableHead>
                  <TableHead className="px-4">End Date</TableHead>
                  {(canEdit || canDelete) && (
                    <TableHead className="px-4 text-right">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {events
                  .filter((event) => event.eventType.code !== "holiday")
                  .map((event, index) => {
                    const type = eventTypeMap.get(event.eventTypeId);
                    return (
                      <TableRow key={event.id}>
                        <TableCell className="px-4">{index + 1}</TableCell>
                        <TableCell className="px-4">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  type?.colorHex ?? "#64748b",
                              }}
                            />
                            <span className="truncate font-medium">
                              {event.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 text-sm">
                          {event.startDate.slice(0, 10)}
                        </TableCell>
                        <TableCell className="px-4 text-sm">
                          {event.endDate.slice(0, 10)}
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell className="px-4">
                            <div className="flex items-center justify-end gap-2">
                              {canEdit && !event.isLocked && (
                                <Button
                                  size="icon-sm"
                                  variant="outline"
                                  aria-label={`Edit ${event.title}`}
                                  onClick={() => openEditDialog(event)}
                                >
                                  <Pencil />
                                </Button>
                              )}
                              {canDelete && event.source === "manual" && (
                                <Button
                                  size="icon-sm"
                                  variant="outline"
                                  aria-label={`Delete ${event.title}`}
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(event)}
                                >
                                  <Trash2 />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            {events.every((event) => event.eventType.code === "holiday") && (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No events yet. Click "Add Event" to schedule one.
              </p>
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Calendar Event" : "Add Calendar Event"}
            </DialogTitle>
            <DialogDescription>
              {editing && editing.isLocked
                ? "This system event is locked."
                : "Schedule a holiday, exam, graduation, or custom event."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Event Type</Label>
              <Select
                value={form.eventTypeId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, eventTypeId: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Mid-Term Exams Start"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      startDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      endDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional notes..."
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                saving ||
                !form.eventTypeId ||
                !form.title.trim() ||
                !form.startDate ||
                !form.endDate
              }
              onClick={handleSubmit}
            >
              {saving && <Loader2 className="animate-spin" />}
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
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
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleteTarget?.title}". This action
              cannot be undone.
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
