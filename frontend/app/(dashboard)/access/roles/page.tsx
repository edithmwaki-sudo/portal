"use client"

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";

import { RolesToolbar } from "@/components/dashboard/roles/roles-toolbar";
import { EditRoleDialog } from "@/components/dashboard/roles/edit-role-dialog";
import { DeleteRoleDialog } from "@/components/dashboard/roles/delete-role-dialog";
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
import { getRoles, type RoleResponse } from "@/lib/api/roles";

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [editRole, setEditRole] = useState<RoleResponse | null>(null);
  const [deleteRole, setDeleteRole] = useState<RoleResponse | null>(null);

  const loadRoles = useCallback(() => {
    setRefresh((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      getRoles(1, 100, query.trim() || undefined)
        .then((data) => {
          if (!cancelled) setRoles(data.items);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load roles. Please try again.");
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
      <RolesToolbar />
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
              placeholder="Search by role name or display name..."
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
                <TableHead className="px-4">View Permissions</TableHead>
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
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-56" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="ml-auto h-8 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {error}
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {query.trim()
                      ? `No roles match "${query.trim()}".`
                      : 'No roles yet. Click "Add Role" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role, index) => (
                  <TableRow key={role.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4">
                      {role.displayName !== role.name ? (
                        <>
                          <span className="font-medium">{role.displayName}</span>
                          <span className="ml-2 text-muted-foreground">({role.name})</span>
                        </>
                      ) : (
                        <span className="font-medium">{role.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      {role.permissions.length > 0 ? (
                        <Button asChild variant="link" size="sm" className="px-0">
                          <Link href={`/access/roles/assign-permission?roleId=${role.id}`}>
                            View permissions
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild variant="link" size="sm" className="px-0">
                          <Link href={`/access/roles/assign-permission?roleId=${role.id}`}>
                            <KeyRound />
                            Add permissions
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Edit ${role.name}`}
                          onClick={() => setEditRole(role)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="destructive"
                          aria-label={`Delete ${role.name}`}
                          onClick={() => setDeleteRole(role)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <EditRoleDialog
        role={editRole}
        open={!!editRole}
        onOpenChange={(open) => {
          if (!open) setEditRole(null);
        }}
        onUpdated={loadRoles}
      />
      <DeleteRoleDialog
        role={deleteRole}
        open={!!deleteRole}
        onOpenChange={(open) => {
          if (!open) setDeleteRole(null);
        }}
        onDeleted={loadRoles}
      />
    </>
  );
}
