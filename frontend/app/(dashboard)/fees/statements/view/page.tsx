"use client"

import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Button } from "@/components/ui/button";
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
  downloadFeeStatementPdf,
  getFeeStatement,
  type FeeStatementDetail,
  type FeeStatementScope,
} from "@/lib/api/fees";
import { hasAnyPermission, usePermissions } from "@/hooks/use-current-user";

const CURRENCY = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 2,
});

const SCOPE_LABELS: Record<FeeStatementScope, string> = {
  session_to_date: "Session to date",
  per_session: "Per session",
  per_year: "Per year",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function balanceClass(value: number): string {
  if (value > 0) return "text-destructive";
  if (value < 0) return "text-primary";
  return "";
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg bg-card p-5 shadow-lg shadow-black/5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "positive"
            ? "text-primary"
            : tone === "negative"
              ? "text-destructive"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function FeeStatementViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions } = usePermissions();

  const id = Number(searchParams.get("id")) || undefined;
  const [scope, setScope] = useState<FeeStatementScope>("session_to_date");
  const [data, setData] = useState<FeeStatementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getFeeStatement(id, { scope: scope === "per_session" ? undefined : scope })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load the fee statement. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, scope]);

  const canView = hasAnyPermission(permissions, ["feestatement.view"]);

  if (!canView) {
    return (
      <PageToolbar
        title="Fee Statement"
        description="You do not have permission to view fee statements."
      />
    );
  }

  async function handleDownload() {
    if (!id) return;
    setDownloading(true);
    try {
      await downloadFeeStatementPdf(id, {
        scope: scope === "per_session" ? undefined : scope,
      });
    } catch {
      // Silent: browser download dialogs cannot surface errors reliably.
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <PageToolbar
        title="Fee Statement"
        description={
          data
            ? `${data.student.name} — ${data.scope.label}`
            : "Student ledger statement"
        }
        quickLinks={[
          { label: "All Statements", href: "/fees/statements" },
          { label: "Invoices", href: "/invoices" },
        ]}
        primaryActions={[
          {
            label: "Download PDF",
            icon: Download,
            onClick: handleDownload,
            disabled: downloading || !data,
          },
        ]}
      />
      <div className="mx-[50px] mb-[30px] grid gap-6">
        {!id ? (
          <div className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground shadow-lg shadow-black/5">
            Missing student id.
          </div>
        ) : loading ? (
          <div className="grid gap-4 rounded-lg bg-card p-6 shadow-lg shadow-black/5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error || !data ? (
          <div className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground shadow-lg shadow-black/5">
            {error ?? "Could not load the fee statement."}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-lg bg-card p-6 shadow-lg shadow-black/5 md:flex-row md:items-center md:justify-between">
              <div className="grid gap-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{data.student.name}</h2>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {data.student.admissionNumber ?? "No admission no."}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.course
                    ? `${data.course.name ?? "Course"} (${data.course.code ?? "—"})`
                    : "No course"}
                  {data.department?.name ? ` — ${data.department.name}` : ""}
                </p>
              </div>
              <Select
                value={scope}
                onValueChange={(value) => {
                  setScope(value as FeeStatementScope);
                  setLoading(true);
                }}
              >
                <SelectTrigger className="w-full md:w-52">
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

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Total Invoiced" value={CURRENCY.format(data.summary.totalInvoiced)} />
              <StatCard label="Total Paid" value={CURRENCY.format(data.summary.totalPaid)} tone="positive" />
              <StatCard
                label="Outstanding Balance"
                value={CURRENCY.format(data.summary.outstandingBalance)}
                tone={data.summary.outstandingBalance > 0 ? "negative" : undefined}
              />
              <StatCard
                label="Credit Balance"
                value={CURRENCY.format(data.summary.creditBalance)}
                tone={data.summary.creditBalance > 0 ? "positive" : undefined}
              />
              <StatCard label="Unallocated" value={CURRENCY.format(data.summary.unallocated)} />
            </div>

            <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
              <div className="border-b px-6 py-4">
                <h3 className="text-base font-semibold">Session Summary</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sessionBreakdown.map((bucket) => (
                    <TableRow key={bucket.sessionName}>
                      <TableCell>{bucket.sessionName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {CURRENCY.format(bucket.fees)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {CURRENCY.format(bucket.paid)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${balanceClass(
                          bucket.outstanding
                        )}`}
                      >
                        {CURRENCY.format(bucket.outstanding)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
              <div className="border-b px-6 py-4">
                <h3 className="text-base font-semibold">Ledger</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit (KES)</TableHead>
                    <TableHead className="text-right">Credit (KES)</TableHead>
                    <TableHead className="text-right">Balance (KES)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No transactions in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.transactions.map((transaction) => (
                      <TableRow
                        key={`${transaction.sessionLabel}-${transaction.number}`}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          {transaction.number}
                        </TableCell>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {transaction.reference || "—"}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <p className="truncate">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.sessionLabel}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {transaction.debit ? CURRENCY.format(transaction.debit) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {transaction.credit ? CURRENCY.format(transaction.credit) : "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium tabular-nums ${balanceClass(
                            transaction.balance
                          )}`}
                        >
                          {CURRENCY.format(transaction.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => router.push("/fees/statements")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Statements
              </Button>
              <Button onClick={handleDownload} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {downloading ? "Preparing..." : "Download PDF"}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
