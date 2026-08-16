"use client"

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
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
import { getStaff, type StaffResponse } from "@/lib/api/staff";

export function StaffOnboardingClient() {
  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      getStaff(1, 100, query.trim() || undefined)
        .then((data) => {
          if (!cancelled) setStaff(data.items);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load staff. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <>
      <PageToolbar
        title="Staff"
        description="Onboard staff members and manage existing ones."
        primaryActions={[
          { label: "Add Staff", icon: Plus, href: "/staff/create" },
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <form
            className="flex items-center gap-2 border-b px-4 pb-4 pt-4"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email or employee number..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-sm"
            />
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Emp. No.</TableHead>
                <TableHead className="px-4">Email</TableHead>
                <TableHead className="px-4">Department</TableHead>
                <TableHead className="px-4">Job Title</TableHead>
                <TableHead className="px-4">Status</TableHead>
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
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-16" />
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
              ) : staff.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No staff match "${query.trim()}".`
                      : 'No staff yet. Click "Add Staff" to onboard one.'}
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member, index) => (
                  <TableRow key={member.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4 font-medium">
                      {member.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      {member.employeeNumber ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">{member.email ?? "—"}</TableCell>
                    <TableCell className="px-4">
                      {member.departmentName ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      {member.jobTitle ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          member.status
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {member.status ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
