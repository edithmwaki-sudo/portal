"use client"

import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { FeeStatusBadge } from "@/components/dashboard/fees/fee-status-badge";
import { DeleteCourseFeeAssignmentDialog } from "@/components/dashboard/fees/delete-course-fee-assignment-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  getCourseFeeAssignments,
  type CourseFeeAssignment,
} from "@/lib/api/fees";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

type StatusFilter = "all" | "active" | "inactive";

export default function CourseFeeAssignmentsPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canManage = hasAnyPermission(permissions, ["fee_assignment.manage"]);

  const [assignments, setAssignments] = useState<CourseFeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [refresh, setRefresh] = useState(0);
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<CourseFeeAssignment | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (permissionsLoading) return;
      setLoading(true);
      setError(null);

      getCourseFeeAssignments({
        page: 1,
        limit: 100,
        search: query.trim() || undefined,
        status: status === "all" ? undefined : status,
      })
        .then((data) => {
          if (!cancelled) setAssignments(data.items);
        })
        .catch(() => {
          if (!cancelled)
            setError(
              "Failed to load course fee assignments. Please try again."
            );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, status, refresh, permissionsLoading]);

  return (
    <>
      <PageToolbar
        title="Course Fee Assignments"
        description="Assign fee structures to courses within a curriculum period."
        primaryActions={[
          {
            label: "Add Assignment",
            icon: Plus,
            href: "/fees/assignments/create",
          },
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-white shadow-lg shadow-black/5">
          <form
            className="flex items-center gap-2 border-b px-4 pb-4 pt-4"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by course, curriculum, period or fee name..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as StatusFilter)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Course</TableHead>
                <TableHead className="px-4">Curriculum</TableHead>
                <TableHead className="px-4">Academic Period</TableHead>
                <TableHead className="px-4">Fee Structure</TableHead>
                <TableHead className="px-4">Effective</TableHead>
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
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="ml-auto h-8 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : assignments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim() || status !== "all"
                      ? 'No assignments match your filters.'
                      : 'No assignments yet. Click "Add Assignment" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment, index) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4">
                      <span className="font-medium">
                        {assignment.courseName}
                      </span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {assignment.courseCode}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      {assignment.curriculumName}
                    </TableCell>
                    <TableCell className="px-4">
                      {assignment.academicYearName} —{" "}
                      {assignment.academicSessionName}
                    </TableCell>
                    <TableCell className="px-4">
                      {assignment.feeStructureName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({assignment.itemsCount} item
                        {assignment.itemsCount === 1 ? "" : "s"})
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      {assignment.effectiveFrom?.slice(0, 10)}
                      {assignment.effectiveTo
                        ? ` → ${assignment.effectiveTo.slice(0, 10)}`
                        : ""}
                    </TableCell>
                    <TableCell className="px-4">
                      <FeeStatusBadge status={assignment.status} />
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Edit assignment for ${assignment.courseName}`}
                          asChild
                        >
                          <Link
                            href={`/fees/assignments/edit?id=${assignment.id}`}
                          >
                            <Pencil />
                          </Link>
                        </Button>
                        {canManage && (
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            aria-label={`Delete assignment for ${assignment.courseName}`}
                            onClick={() => setAssignmentToDelete(assignment)}
                          >
                            <Trash2 />
                          </Button>
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
      <DeleteCourseFeeAssignmentDialog
        assignment={assignmentToDelete}
        open={!!assignmentToDelete}
        onOpenChange={(open) => {
          if (!open) setAssignmentToDelete(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}
