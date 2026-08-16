"use client"

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { RolesToolbar } from "@/components/dashboard/roles/roles-toolbar";
import { RolesPlaceholder } from "@/components/dashboard/roles/roles-placeholder";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPermissions, type PermissionResponse } from "@/lib/api/permissions";
import {
  attachPermission,
  detachPermission,
  getRole,
  type RoleResponse,
} from "@/lib/api/roles";

const LIMIT = 10;

export function AssignPermissions({ roleId }: { roleId: number | null }) {
  const [page, setPage] = useState(1);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<RoleResponse | null>(null);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (roleId === null) return;
    let cancelled = false;

    getRole(roleId)
      .then((data) => {
        if (cancelled) return;
        setRole(data);
        setAssigned(new Set(data.permissions.map((permission) => permission.name)));
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the role.");
      });

    return () => {
      cancelled = true;
    };
  }, [roleId]);

  useEffect(() => {
    if (roleId === null) return;
    let cancelled = false;

    getPermissions(page, LIMIT)
      .then((data) => {
        if (cancelled) return;
        setPermissions(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load permissions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, roleId]);

  const sortedPermissions = useMemo(() => {
    const list = [...permissions];
    list.sort(
      (a, b) => Number(assigned.has(b.name)) - Number(assigned.has(a.name))
    );
    return list;
  }, [permissions, assigned]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function goTo(nextPage: number) {
    setError(null);
    setLoading(true);
    setPage(nextPage);
  }

  async function handleToggle(permissionName: string, checked: boolean) {
    if (roleId === null) return;

    const previous = new Set(assigned);
    const next = new Set(previous);
    if (checked) {
      next.add(permissionName);
    } else {
      next.delete(permissionName);
    }
    setAssigned(next);

    try {
      if (checked) {
        await attachPermission(roleId, permissionName);
        toast.success("Permission assigned");
      } else {
        await detachPermission(roleId, permissionName);
        toast.success("Permission removed");
      }
    } catch {
      setAssigned(previous);
      toast.error("Something went wrong. Please try again.");
    }
  }

  if (roleId === null) {
    return (
      <>
        <RolesToolbar />
        <RolesPlaceholder>
          Pick a role from the Roles page to assign permissions.
        </RolesPlaceholder>
      </>
    );
  }

  return (
    <>
      <RolesToolbar />
      <div className="mx-[50px] mb-[30px]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {role?.displayName ?? role?.name ?? "Role"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Tick the permissions to assign, untick to remove. Assigned
            permissions appear at the top.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="w-24 px-4 text-center">Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="mx-auto h-4 w-4" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {error}
                  </TableCell>
                </TableRow>
              ) : sortedPermissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No permissions found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedPermissions.map((permission, index) => (
                  <TableRow key={permission.name}>
                    <TableCell className="px-4">
                      {(page - 1) * LIMIT + index + 1}
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="font-medium">{permission.name}</span>
                      {permission.description && (
                        <span className="ml-2 text-muted-foreground">
                          {permission.description}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={assigned.has(permission.name)}
                          onCheckedChange={(checked) =>
                            handleToggle(permission.name, checked === true)
                          }
                          aria-label={`Assign ${permission.name}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} permission
              {total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => goTo(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => goTo(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}