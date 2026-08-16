"use client"

import { useCallback, useState } from "react";
import { FileText, Pencil, Trash2, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { DeleteStudentDialog } from "@/components/dashboard/students/delete-student-dialog";
import {
  AsyncSearchSelect,
  type AsyncSearchOption,
} from "@/components/ui/async-search-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStudent, getStudents, type StudentResponse } from "@/lib/api/students";
import { hasAnyPermission, usePermissions } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

interface StudentAction {
  label: string;
  icon: typeof User;
  /** Navigation destination; omit for in-place actions like Delete. */
  href?: (id: number) => string;
  /** Renders as a destructive in-place action (e.g. Delete) instead of a link. */
  destructive?: boolean;
}

/**
 * The inner actions rail shown below the search. Add more entries here as the
 * student workspace grows (fee statement, attendance, results, ...).
 */
const studentActions: StudentAction[] = [
  {
    label: "View Student",
    icon: User,
    href: (id) => `/student/${id}/view`,
  },
  {
    label: "Edit",
    icon: Pencil,
    href: (id) => `/student/edit?id=${id}`,
  },
  {
    label: "Admission Letter",
    icon: FileText,
    href: (id) => `/student/${id}/admission-letter`,
  },
  {
    label: "Delete",
    icon: Trash2,
    destructive: true,
  },
];

/** Active when the current route is the href or one of its descendants. */
function isActiveHref(href: string, pathname: string): boolean {
  const base = href.split("?")[0].replace(/\/+$/, "");
  return pathname === base || pathname.startsWith(base + "/");
}

function getStudentOptions(search: string): Promise<AsyncSearchOption[]> {
  return getStudents({ search, limit: 20 }).then((response) =>
    response.items.map((student) => ({
      id: student.id,
      label: `${student.admissionNumber ?? "—"} — ${student.user.name}`,
    }))
  );
}

export function SearchStudentClient() {
  const pathname = usePathname();
  const { permissions } = usePermissions();
  const canDelete = hasAnyPermission(permissions, [
    "student.delete",
    "student.manage",
  ]);
  const [selected, setSelected] = useState<StudentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentToDelete, setStudentToDelete] =
    useState<StudentResponse | null>(null);

  const handleValueChange = useCallback((value: string | undefined) => {
    if (!value) {
      setSelected(null);
      return;
    }
    setLoading(true);
    getStudent(Number(value))
      .then(setSelected)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageToolbar
        title="Search Student"
        description="Find a student, confirm the match, then open their record, edit it or view documents."
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section className="rounded-lg bg-white p-6 shadow-lg shadow-black/5">
              <h2 className="text-sm font-semibold text-foreground">
                Select a student
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search by name or admission number, then choose the right student
                from the results.
              </p>
              <div className="mt-4">
                <AsyncSearchSelect
                  value={selected ? String(selected.id) : undefined}
                  onValueChange={handleValueChange}
                  getOptions={getStudentOptions}
                  placeholder="Select a student..."
                  searchPlaceholder="Type name or admission number..."
                  minChars={2}
                />
              </div>
            </section>

            <section className="rounded-lg bg-white shadow-lg shadow-black/5">
              <div className="border-b px-6 py-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Confirm the student
                </h2>
              </div>
              {loading ? (
                <div className="p-6">
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">Name</TableHead>
                      <TableHead className="px-6">Admission No.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected ? (
                      <TableRow>
                        <TableCell className="px-6 font-medium">
                          {selected.user.name}
                        </TableCell>
                        <TableCell className="px-6">
                          {selected.admissionNumber ?? "—"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="px-6 py-8 text-center text-sm text-muted-foreground"
                        >
                          Select a student to confirm the match here.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </section>
          </div>

          <section className="w-full max-w-[256px] rounded-lg bg-white shadow-lg shadow-black/5">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                Student actions
              </h2>
            </div>
            <ul className="p-2">
              {studentActions.map((action) => {
                const Icon = action.icon;
                const disabled = !selected;
                const inner = (
                  <>
                    <Icon className="size-4 shrink-0" />
                    <span>{action.label}</span>
                  </>
                );

                if (disabled) {
                  return (
                    <li key={action.label}>
                      <div
                        aria-disabled
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-md border-l-[3px] border-l-transparent px-3 py-2.5 text-sm text-muted-foreground opacity-50"
                      >
                        {inner}
                      </div>
                    </li>
                  );
                }

                if (action.destructive) {
                  if (!canDelete) return null;
                  return (
                    <li key={action.label}>
                      <button
                        type="button"
                        onClick={() => setStudentToDelete(selected)}
                        className="flex w-full items-center gap-2.5 rounded-md border-l-[3px] border-l-transparent px-3 py-2.5 text-sm text-red-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-700"
                      >
                        {inner}
                      </button>
                    </li>
                  );
                }

                const href = action.href!(selected.id);
                const active = isActiveHref(href, pathname);
                return (
                  <li key={action.label}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border-l-[3px] border-l-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground",
                        active &&
                          "border-l-[var(--brand)] bg-muted font-medium text-foreground"
                      )}
                    >
                      {inner}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
      <DeleteStudentDialog
        student={studentToDelete}
        open={!!studentToDelete}
        onOpenChange={(open) => {
          if (!open) setStudentToDelete(null);
        }}
        onDeleted={() => {
          setSelected(null);
          setStudentToDelete(null);
        }}
      />
    </>
  );
}