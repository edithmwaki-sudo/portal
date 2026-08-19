"use client"

import { useEffect, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { DeleteDepartmentDialog } from "@/components/dashboard/departments/delete-department-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  getDepartments,
  type Department,
} from "@/lib/api/departments";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [deleteDepartment, setDeleteDepartment] = useState<Department | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      getDepartments(1, 100, query.trim() || undefined)
        .then((data) => {
          if (!cancelled) setDepartments(data.items);
        })
        .catch(() => {
          if (!cancelled)
            setError("Failed to load departments. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, refresh]);

  return (
    <>
      <PageToolbar
        title="Departments"
        description="Manage institutional departments and their heads."
        primaryActions={[
          { label: "Add Department", icon: Plus, href: "/departments/create" },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <form
            className="flex items-center gap-2 border-b px-4 pb-4 pt-4"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by code or name..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-sm"
            />
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Code</TableHead>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Head of Department</TableHead>
                <TableHead className="w-12 px-4">Action</TableHead>
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
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : departments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No departments match "${query.trim()}".`
                      : 'No departments yet. Click "Add Department" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((department, index) => (
                  <TableRow key={department.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4 font-mono text-xs">
                      {department.code}
                    </TableCell>
                    <TableCell className="px-4 font-medium">
                      {department.name}
                    </TableCell>
                    <TableCell className="px-4">
                      {department.headOfDepartmentName ? (
                        <>
                          <span>{department.headOfDepartmentName}</span>
                          {department.headOfDepartmentEmployeeNumber && (
                            <span className="ml-2 text-muted-foreground">
                              ({department.headOfDepartmentEmployeeNumber})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Not assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${department.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/departments/edit?id=${department.id}`}>
                              <Pencil />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteDepartment(department)}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DeleteDepartmentDialog
        department={deleteDepartment}
        open={!!deleteDepartment}
        onOpenChange={(open) => {
          if (!open) setDeleteDepartment(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}