"use client"

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { DeleteAcademicSessionDialog } from "@/components/dashboard/calendar/delete-academic-session-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  getAcademicYear,
  type AcademicYear,
} from "@/lib/api/academic-years";
import {
  getAcademicSessions,
  type AcademicSession,
} from "@/lib/api/academic-sessions";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function CalendarSessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearId = Number(searchParams.get("yearId")) || undefined;

  const { permissions, loading: permissionsLoading } = usePermissions();
  const canView = hasAnyPermission(permissions, ["academic_year.view"]);
  const canAdd = hasAnyPermission(permissions, ["academic_session.add"]);
  const canEdit = hasAnyPermission(permissions, ["academic_session.edit"]);
  const canDelete = hasAnyPermission(permissions, ["academic_session.delete"]);

  const [year, setYear] = useState<AcademicYear | null>(null);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [sessionToDelete, setSessionToDelete] =
    useState<AcademicSession | null>(null);

  useEffect(() => {
    if (!yearId) return;
    let cancelled = false;
    getAcademicYear(yearId)
      .then((data) => {
        if (!cancelled) setYear(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [yearId, refresh]);

  useEffect(() => {
    if (!yearId || permissionsLoading) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getAcademicSessions({
        page: 1,
        limit: 100,
        academicYearId: yearId,
        search: query.trim() || undefined,
      })
        .then((data) => {
          if (!cancelled) {
            setSessions(data.items);
            setTotal(data.total);
          }
        })
        .catch(() => {
          if (!cancelled)
            setError("Failed to load sessions. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [yearId, query, refresh, permissionsLoading]);

  const applySearch = useCallback(() => setQuery(search), [search]);

  if (!permissionsLoading && !canView) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view the academic calendar.
      </p>
    );
  }

  return (
    <>
      <PageToolbar
        title="Academic Sessions"
        description={
          year ? `${year.code} ${year.name}`.trim() : "Sessions for an academic year."
        }
        primaryActions={[
          {
            label: "Back to Years",
            icon: ArrowLeft,
            href: "/calendar",
            variant: "outline",
          },
          ...(canAdd && yearId
            ? [
                {
                  label: "Add Session",
                  icon: Plus,
                  href: `/calendar/sessions/create?yearId=${yearId}`,
                },
              ]
            : []),
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <form
            className="border-b px-4 py-4"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by code or name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applySearch();
                  }
                }}
                className="max-w-sm"
              />
              <Button type="button" variant="outline" onClick={applySearch}>
                Search
              </Button>
            </div>
          </form>

          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Code</TableHead>
                <TableHead className="px-4">Session Name</TableHead>
                <TableHead className="px-4">Period</TableHead>
                <TableHead className="px-4">Events</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-44" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="ml-auto h-8 w-28" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No sessions match "${query.trim()}".`
                      : 'No sessions for this year yet. Click "Add Session" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session, index) => (
                  <TableRow key={session.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4 font-medium">
                      {session.code}
                    </TableCell>
                    <TableCell className="px-4">{session.name}</TableCell>
                    <TableCell className="px-4 text-sm">
                      {session.startDate
                        ? `${session.startDate.slice(0, 10)} – ${
                            session.endDate?.slice(0, 10) ?? "…"
                          }`
                        : "—"}
                    </TableCell>
                    <TableCell className="px-4">{session.eventCount}</TableCell>
                    <TableCell className="px-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          session.isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {session.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Open calendar for ${session.name}`}
                          onClick={() =>
                            router.push(`/calendar/session?id=${session.id}`)
                          }
                        >
                          <CalendarDays />
                        </Button>
                        {canEdit && (
                          <>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              aria-label={`Edit ${session.name}`}
                              onClick={() =>
                                router.push(
                                  `/calendar/sessions/edit?id=${session.id}`
                                )
                              }
                            >
                              <Pencil />
                            </Button>
                            {canDelete && (
                              <Button
                                size="icon-sm"
                                variant="destructive"
                                aria-label={`Delete ${session.name}`}
                                onClick={() => setSessionToDelete(session)}
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DeleteAcademicSessionDialog
        session={sessionToDelete}
        open={!!sessionToDelete}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}
