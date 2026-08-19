"use client"

import { useCallback, useEffect, useState } from "react";
import { Eye, MoreHorizontal, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  getFeeStatements,
  type FeeStatementListItem,
  type FeeStatementScope,
} from "@/lib/api/fees";
import { hasAnyPermission, usePermissions } from "@/hooks/use-current-user";

const CURRENCY = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const SCOPE_LABELS: Record<FeeStatementScope, string> = {
  session_to_date: "Session to date",
  per_session: "Per session",
  per_year: "Per year",
};

export default function FeeStatementsPage() {
  const router = useRouter();
  const { permissions } = usePermissions();
  const [items, setItems] = useState<FeeStatementListItem[]>([]);
  const [scope, setScope] = useState<FeeStatementScope>("session_to_date");
  const [scopeLabel, setScopeLabel] = useState("Session to date");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(
    (search: string, selectedScope: FeeStatementScope) => {
      let cancelled = false;
      const timer = setTimeout(() => {
        getFeeStatements({
          page: 1,
          limit: 100,
          search: search.trim() || undefined,
          scope: selectedScope === "per_session" ? undefined : selectedScope,
        })
          .then((data) => {
            if (!cancelled) {
              setItems(data.items);
              setScopeLabel(data.scope.label);
              setError(null);
            }
          })
          .catch(() => {
            if (!cancelled) {
              setError("Failed to load fee statements. Please try again.");
            }
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      }, 300);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    },
    []
  );

  useEffect(() => {
    const cleanup = load(query, scope);
    return cleanup;
  }, [query, scope, refresh, load]);

  const canView = hasAnyPermission(permissions, ["feestatement.view"]);

  if (!canView) {
    return (
      <PageToolbar
        title="Fee Statements"
        description="You do not have permission to view fee statements."
      />
    );
  }

  return (
    <>
      <PageToolbar
        title="Fee Statements"
        description="All student fee statements — invoices debit, payments credit."
        primaryActions={[
          {
            label: "Refresh",
            icon: Search,
            onClick: () => {
              setLoading(true);
              setRefresh((value) => value + 1);
            },
          },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <div className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or admission number..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLoading(true);
                }}
              />
            </div>
            <Select
              value={scope}
              onValueChange={(value) => {
                setScope(value as FeeStatementScope);
                setLoading(true);
              }}
            >
              <SelectTrigger size="sm" className="w-full md:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session_to_date">
                  {SCOPE_LABELS.session_to_date}
                </SelectItem>
                <SelectItem value="per_year">{SCOPE_LABELS.per_year}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid gap-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{error}</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No students found for {scopeLabel}.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Invoiced</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-12 px-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/fees/statements/view?id=${item.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.admissionNumber ? (
                        <div className="text-sm text-muted-foreground">
                          {item.admissionNumber}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.courseCode ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {CURRENCY.format(item.invoiced)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {CURRENCY.format(item.paid)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        item.balance > 0
                          ? "text-destructive"
                          : item.balance < 0
                            ? "text-primary"
                            : ""
                      }`}
                    >
                      {CURRENCY.format(item.balance)}
                    </TableCell>
                    <TableCell className="px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${item.name}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/fees/statements/view?id=${item.id}`);
                            }}
                          >
                            <Eye />
                            View Statement
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
