"use client"

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

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
import { getAuditLogs, type AuditEntry } from "@/lib/api/audit";
import { Button } from "@/components/ui/button";

const LIMIT = 25;

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AuditLogsPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      getAuditLogs(page, LIMIT, query.trim() || undefined)
        .then((data) => {
          if (!cancelled) {
            setEntries(data.items);
            setTotal(data.total);
          }
        })
        .catch(() => {
          if (!cancelled)
            setError("Failed to load audit logs. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, page]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function goTo(nextPage: number) {
    setError(null);
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <>
      <PageToolbar
        title="Audit Logs"
        description="Review who did what, when, and from where."
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
              placeholder="Search by user, action, entity or IP address..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-sm"
            />
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Time</TableHead>
                <TableHead className="px-4">User</TableHead>
                <TableHead className="px-4">Action</TableHead>
                <TableHead className="px-4">Entity</TableHead>
                <TableHead className="px-4">IP Address</TableHead>
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
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No audit entries match "${query.trim()}".`
                      : "No audit entries recorded yet."}
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    <TableCell className="px-4">
                      {(page - 1) * LIMIT + index + 1}
                    </TableCell>
                    <TableCell className="px-4 whitespace-nowrap text-muted-foreground">
                      {formatTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="px-4">
                      {entry.user ? (
                        <>
                          <span className="font-medium">{entry.user.name}</span>
                          <span className="ml-2 text-muted-foreground">
                            (@{entry.user.username})
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="font-mono text-xs text-emerald-700">
                        {entry.action}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      {entry.entityType ? (
                        <span className="text-muted-foreground">
                          {entry.entityType}
                          {entry.entityId != null ? ` #${entry.entityId}` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 font-mono text-xs">
                      {entry.ipAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} entr{total === 1 ? "y" : "ies"}
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
