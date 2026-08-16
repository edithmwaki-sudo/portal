"use client"

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Button } from "@/components/ui/button";
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
  getPermissions,
  syncPermissions,
  type PermissionResponse,
} from "@/lib/api/permissions";

const LIMIT = 10;

export default function PermissionsPage() {
  const [page, setPage] = useState(1);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getPermissions(page, LIMIT)
      .then((data) => {
        if (!cancelled) {
          setPermissions(data.items);
          setTotal(data.total);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load permissions. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  function goTo(nextPage: number) {
    setError(null);
    setLoading(true);
    setPage(nextPage);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const data = await syncPermissions();
      setPage(1);
      setPermissions(data.items);
      setTotal(data.total);
      setError(null);
      toast.success("Permissions synced from the permission file");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <PageToolbar
        title="Permissions"
        description="View and sync access permissions."
        primaryActions={[
          {
            label: syncing ? "Syncing..." : "Sync Permissions",
            icon: RefreshCw,
            variant: "outline",
            onClick: handleSync,
          },
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Description</TableHead>
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
                      <Skeleton className="h-4 w-64" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {error}
                  </TableCell>
                </TableRow>
              ) : permissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No permissions found.
                  </TableCell>
                </TableRow>
              ) : (
                permissions.map((permission, index) => (
                  <TableRow key={permission.name}>
                    <TableCell className="px-4">
                      {(page - 1) * LIMIT + index + 1}
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="font-medium">{permission.name}</span>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {permission.description ?? "—"}
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
