"use client"

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { DeleteAcademicYearDialog } from "@/components/dashboard/calendar/delete-academic-year-dialog";
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
  getAcademicYears,
  type AcademicYear,
} from "@/lib/api/academic-years";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function CalendarPage() {
  const router = useRouter();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canView = hasAnyPermission(permissions, ["academic_year.view"]);
  const canAdd = hasAnyPermission(permissions, ["academic_year.add"]);
  const canEdit = hasAnyPermission(permissions, ["academic_year.edit"]);
  const canDelete = hasAnyPermission(permissions, ["academic_year.delete"]);

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);

  useEffect(() => {
    if (permissionsLoading) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getAcademicYears({
        page: 1,
        limit: 100,
        search: query.trim() || undefined,
      })
        .then((data) => {
          if (!cancelled) {
            setYears(data.items);
            setTotal(data.total);
          }
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load academic years. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, refresh, permissionsLoading]);

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
        title="Academic Calendar"
        description={`${total} academic year${total === 1 ? "" : "s"} on record.`}
        primaryActions={
          canAdd
            ? [
                {
                  label: "Add Academic Year",
                  icon: Plus,
                  href: "/calendar/years/create",
                },
              ]
            : undefined
        }
      />
      <div className="mx-[50px] mb-[30px]">
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
                <TableHead className="px-4">Year Name</TableHead>
                <TableHead className="px-4">Period</TableHead>
                <TableHead className="px-4">Sessions</TableHead>
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
              ) : years.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No academic years match "${query.trim()}".`
                      : 'No academic years yet. Click "Add Academic Year" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                years.map((year, index) => (
                  <TableRow key={year.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4 font-medium">
                      {year.code}
                    </TableCell>
                    <TableCell className="px-4">{year.name}</TableCell>
                    <TableCell className="px-4 text-sm">
                      {year.startDate
                        ? `${year.startDate.slice(0, 10)} – ${
                            year.endDate?.slice(0, 10) ?? "…"
                          }`
                        : "—"}
                    </TableCell>
                    <TableCell className="px-4">{year.sessionCount}</TableCell>
                    <TableCell className="px-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          year.isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {year.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`View sessions for ${year.name}`}
                          onClick={() =>
                            router.push(`/calendar/sessions?yearId=${year.id}`)
                          }
                        >
                          <CalendarDays />
                        </Button>
                        {canEdit && (
                          <>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              aria-label={`Edit ${year.name}`}
                              onClick={() =>
                                router.push(`/calendar/years/edit?id=${year.id}`)
                              }
                            >
                              <Pencil />
                            </Button>
                            {canDelete && (
                              <Button
                                size="icon-sm"
                                variant="destructive"
                                aria-label={`Delete ${year.name}`}
                                onClick={() => setYearToDelete(year)}
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
      <DeleteAcademicYearDialog
        year={yearToDelete}
        open={!!yearToDelete}
        onOpenChange={(open) => {
          if (!open) setYearToDelete(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}
