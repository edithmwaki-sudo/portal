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
import { getAppLogs, type AppLogEntry } from "@/lib/api/logs";
import { Button } from "@/components/ui/button";

const LIMIT = 25;

const LEVEL_STYLES: Record<string, string> = {
  trace: "bg-muted text-muted-foreground",
  debug: "bg-sky-100 text-sky-700",
  info: "bg-primary/10 text-primary",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  error: "bg-destructive/10 text-destructive",
  fatal: "bg-destructive/15 text-destructive",
};

function formatTime(value: string): string {
  if (!value) return "";
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AppLogsPage() {
  const [logs, setLogs] = useState<AppLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      getAppLogs(page, LIMIT, query.trim() || undefined)
        .then((data) => {
          if (!cancelled) {
            setLogs(data.items);
            setTotal(data.total);
          }
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load app logs. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, page, refresh]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function goTo(nextPage: number) {
    setError(null);
    setLoading(true);
    setPage(nextPage);
  }

  const loadMore = () => setRefresh((value) => value + 1);

  return (
    <>
      <PageToolbar
        title="App Logs"
        description="Raw application log output from the API server."
        primaryActions={[{ label: "Refresh", onClick: loadMore }]}
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
              placeholder="Search log output..."
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
                <TableHead className="px-4">Level</TableHead>
                <TableHead className="px-4">Context</TableHead>
                <TableHead className="px-4">Method / URL</TableHead>
                <TableHead className="px-4">Message</TableHead>
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
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-64" />
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
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No log lines match "${query.trim()}".`
                      : "No log entries recorded yet."}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((entry, index) => {
                  const method =
                    typeof entry.method === "string" ? entry.method : "";
                  const url = typeof entry.url === "string" ? entry.url : "";
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="px-4">
                        {(page - 1) * LIMIT + index + 1}
                      </TableCell>
                      <TableCell className="px-4 whitespace-nowrap text-muted-foreground">
                        {formatTime(entry.time)}
                      </TableCell>
                      <TableCell className="px-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            LEVEL_STYLES[entry.level] ??
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {entry.level}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {entry.context ?? "http"}
                      </TableCell>
                      <TableCell className="px-4 font-mono text-xs text-muted-foreground">
                        {method ? `${method} ` : ""}
                        {url || "—"}
                      </TableCell>
                      <TableCell className="px-4">{entry.message || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} log line
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
