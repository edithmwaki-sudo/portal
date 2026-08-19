"use client"

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, XCircle, Clock3, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getAssignedUnits,
  getUnitRoster,
  getAttendanceRecords,
  markAttendance,
  type AssignedUnit,
  type RosterStudent,
  type AttendanceEntry,
} from "@/lib/api/attendance";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status = "present" | "absent" | "late" | "excused";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canView = hasAnyPermission(permissions, ["attendance.view", "attendance.mark"]);
  const canMark = hasAnyPermission(permissions, ["attendance.mark"]);

  const [units, setUnits] = useState<AssignedUnit[]>([]);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [records, setRecords] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sessionDate, setSessionDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("08:00");
  const [status, setStatus] = useState<Status>("present");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!permissionsLoading && canView) {
      getAssignedUnits()
        .then((data) => {
          setUnits(data);
          setUnitId((current) => {
            if (current && data.some((unit) => unit.id === current)) {
              return current;
            }
            return data[0]?.id ?? null;
          });
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }
  }, [permissionsLoading, canView]);

  useEffect(() => {
    if (!unitId) {
      setRoster([]);
      setRecords([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getUnitRoster(unitId),
      getAttendanceRecords(unitId, sessionDate),
    ])
      .then(([rosterData, recordData]) => {
        if (cancelled) return;
        setRoster(rosterData);
        setRecords(recordData);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load attendance data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [unitId, sessionDate]);

  if (!permissionsLoading && !canView) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view attendance.
      </p>
    );
  }

  const selectedUnit = units.find((unit) => unit.id === unitId) ?? null;

  const recordStatusByStudent = useMemo(() => {
    const map = new Map<number, AttendanceEntry>();
    for (const record of records) {
      if (record.studentProfileId !== null) {
        map.set(record.studentProfileId, record);
      }
    }
    return map;
  }, [records]);

  async function handleMarkAll() {
    if (!unitId || roster.length === 0) return;
    setSaving(true);
    try {
      const result = await markAttendance({
        unitId,
        sessionDate,
        startTime,
        studentProfileIds: roster.map((student) => student.id),
        status,
      });
      toast.success(`Marked ${result.marked} student(s) as ${status}`);
      const fresh = await getAttendanceRecords(unitId, sessionDate);
      setRecords(fresh);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to mark attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  function statusBadge(status: string) {
    const classes: Record<string, string> = {
      present: "bg-primary/10 text-primary",
      absent: "bg-destructive/10 text-destructive",
      late: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      excused: "bg-sky-100 text-sky-700",
    };
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          classes[status] ?? "bg-muted text-muted-foreground"
        )}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  return (
    <>
      <PageToolbar
        title="Attendance"
        description="Mark and review class attendance for your assigned units."
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px] space-y-4 sm:space-y-6 lg:space-y-[30px]">
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <div className="border-b px-4 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full max-w-sm space-y-1.5">
                <Label>Unit</Label>
                <Select
                  value={unitId ? String(unitId) : ""}
                  onValueChange={(value) => setUnitId(Number(value))}
                >
                  <SelectTrigger size="sm" className="w-full">
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
              </div>
              <div className="w-44 space-y-1.5">
                <Label>Session Date</Label>
                <Input
                  type="date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                />
              </div>
              <div className="w-36 space-y-1.5">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
              {canMark && (
                <div className="w-40 space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as Status)}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {!unitId ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {units.length === 0
                ? "No units assigned to you as a trainer yet. They will appear once you are scheduled on a timetable."
                : "Select a unit to load its roster."}
            </p>
          ) : loading ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              Loading attendance...
            </p>
          ) : error ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : roster.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              No students on the roster for {selectedUnit?.name ?? "this unit"}.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {roster.length} student{roster.length === 1 ? "" : "s"} on the
                  roster
                </p>
                {canMark && (
                  <Button
                    onClick={handleMarkAll}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving && <Loader2 className="animate-spin" />}
                    Mark All as{" "}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((student) => {
                    const record = recordStatusByStudent.get(student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        <TableCell>{student.admissionNumber ?? "—"}</TableCell>
                        <TableCell>{student.level ?? "—"}</TableCell>
                        <TableCell>
                          {record
                            ? statusBadge(record.status)
                            : statusBadge("absent")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </div>

        {records.length > 0 && (
          <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">
                Records for {sessionDate}
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 px-6 py-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {records.filter((r) => r.status === "present").length} Present
              </span>
              <span className="inline-flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-destructive" />
                {records.filter((r) => r.status === "absent").length} Absent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                {records.filter((r) => r.status === "late").length} Late
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-sky-600" />
                {records.filter((r) => r.status === "excused").length} Excused
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.student?.name ?? "—"}
                    </TableCell>
                    <TableCell>{record.startTime}</TableCell>
                    <TableCell>{statusBadge(record.status)}</TableCell>
                    <TableCell>{record.remarks ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
