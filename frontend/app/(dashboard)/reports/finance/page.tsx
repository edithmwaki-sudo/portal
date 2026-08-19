"use client"

import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, ReceiptText, RefreshCw } from "lucide-react";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
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
  getFinanceReports,
  type FinanceReports,
  type PaymentMethod,
} from "@/lib/api/reports";
import { hasAnyPermission, usePermissions } from "@/hooks/use-current-user";

const CURRENCY = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  M_PESA: "M-Pesa",
  CHEQUE: "Cheque",
  CARD: "Card",
  OTHER: "Other",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-card p-5 shadow-lg shadow-black/5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-base font-semibold text-foreground">{children}</h3>
  );
}

export default function FinanceReportsPage() {
  const { permissions } = usePermissions();
  const [data, setData] = useState<FinanceReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getFinanceReports()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load finance reports. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const canView = hasAnyPermission(permissions, ["finance.reports.view"]);

  if (!canView) {
    return (
      <PageToolbar
        title="Finance Reports"
        description="You do not have permission to view finance reports."
      />
    );
  }

  return (
    <>
      <PageToolbar
        title="Finance Reports"
        description="Management overview of billing, collections, and outstanding balances."
        primaryActions={[
          {
            label: "Refresh",
            icon: RefreshCw,
            onClick: () => {
              setLoading(true);
              setRefresh((value) => value + 1);
            },
          },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px] grid gap-4 sm:gap-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg bg-card p-8 text-center shadow-lg shadow-black/5">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Billed" value={CURRENCY.format(data.overview.billed)} />
              <StatCard label="Collected" value={CURRENCY.format(data.overview.collected)} />
              <StatCard label="Outstanding" value={CURRENCY.format(data.overview.outstanding)} />
              <StatCard label="Cash Collected" value={CURRENCY.format(data.overview.cashCollected)} />
              <StatCard label="Credit on Account" value={CURRENCY.format(data.overview.credit)} />
              <StatCard
                label="Collection Rate"
                value={`${(data.overview.collectionRate * 100).toFixed(1)}%`}
                hint={`${data.overview.invoiceCount} invoices, ${data.overview.paymentCount} payments`}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-lg bg-card p-5 shadow-lg shadow-black/5">
                <CardTitle>Aging of Outstanding Balances</CardTitle>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Bucket</TableHead>
                      <TableHead className="px-4 text-right">Invoices</TableHead>
                      <TableHead className="px-4 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.aging.map((bucket) => (
                      <TableRow key={bucket.bucket}>
                        <TableCell className="px-4">
                          {bucket.bucket === "current"
                            ? "Current (not yet due)"
                            : `${bucket.bucket} days past due`}
                        </TableCell>
                        <TableCell className="px-4 text-right tabular-nums">
                          {bucket.count}
                        </TableCell>
                        <TableCell className="px-4 text-right tabular-nums">
                          {CURRENCY.format(bucket.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-lg bg-card p-5 shadow-lg shadow-black/5">
                <CardTitle>Billing Summary by Course</CardTitle>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Course</TableHead>
                      <TableHead className="px-4 text-right">Students</TableHead>
                      <TableHead className="px-4 text-right">Billed</TableHead>
                      <TableHead className="px-4 text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.courseSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No billing data yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.courseSummary.map((row) => (
                        <TableRow key={row.courseId ?? "unassigned"}>
                          <TableCell className="px-4 font-medium">
                            {row.courseName ?? "Unassigned"}
                            {row.courseCode ? ` (${row.courseCode})` : ""}
                          </TableCell>
                          <TableCell className="px-4 text-right tabular-nums">
                            {row.students}
                          </TableCell>
                          <TableCell className="px-4 text-right tabular-nums">
                            {CURRENCY.format(row.billed)}
                          </TableCell>
                          <TableCell className="px-4 text-right tabular-nums">
                            {CURRENCY.format(row.outstanding)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-lg bg-card p-5 shadow-lg shadow-black/5">
                <CardTitle>Defaulters</CardTitle>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Student</TableHead>
                      <TableHead className="px-4">Adm No.</TableHead>
                      <TableHead className="px-4 text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.defaulters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No outstanding balances.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.defaulters.map((defaulter) => (
                        <TableRow key={defaulter.id}>
                          <TableCell className="px-4 font-medium">{defaulter.name}</TableCell>
                          <TableCell className="px-4">{defaulter.admissionNumber ?? "—"}</TableCell>
                          <TableCell className="px-4 text-right tabular-nums font-medium">
                            {CURRENCY.format(defaulter.balance)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-lg bg-card p-5 shadow-lg shadow-black/5">
                <CardTitle>Credit Balances</CardTitle>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Student</TableHead>
                      <TableHead className="px-4">Adm No.</TableHead>
                      <TableHead className="px-4 text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.creditBalances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No credits on account.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.creditBalances.map((credit) => (
                        <TableRow key={credit.id}>
                          <TableCell className="px-4 font-medium">{credit.name}</TableCell>
                          <TableCell className="px-4">{credit.admissionNumber ?? "—"}</TableCell>
                          <TableCell className="px-4 text-right tabular-nums font-medium">
                            {CURRENCY.format(credit.credit)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-lg bg-card p-5 shadow-lg shadow-black/5">
                <CardTitle>Collections</CardTitle>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Date</TableHead>
                      <TableHead className="px-4">Method</TableHead>
                      <TableHead className="px-4 text-right">Count</TableHead>
                      <TableHead className="px-4 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.collections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No collections yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.collections
                        .slice()
                        .reverse()
                        .slice(0, 20)
                        .map((row, index) => (
                          <TableRow key={`${row.date}-${row.method}-${index}`}>
                            <TableCell className="px-4">{row.date.slice(0, 10)}</TableCell>
                            <TableCell className="px-4">{METHOD_LABELS[row.method]}</TableCell>
                            <TableCell className="px-4 text-right tabular-nums">{row.count}</TableCell>
                            <TableCell className="px-4 text-right tabular-nums">
                              {CURRENCY.format(row.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-lg bg-card p-5 shadow-lg shadow-black/5">
                <CardTitle>Reversal Register</CardTitle>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Kind</TableHead>
                      <TableHead className="px-4">Reference</TableHead>
                      <TableHead className="px-4">Reason</TableHead>
                      <TableHead className="px-4 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.reversals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No reversals recorded.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.reversals.map((row) => (
                        <TableRow key={`${row.kind}-${row.id}`}>
                          <TableCell className="px-4">
                            <span className="flex items-center gap-2">
                              {row.kind === "payment" ? (
                                <Banknote className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ReceiptText className="h-4 w-4 text-muted-foreground" />
                              )}
                              {row.kind === "payment" ? "Payment" : "Invoice"}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 font-medium">{row.reference}</TableCell>
                          <TableCell className="px-4 text-muted-foreground">{row.reason ?? "—"}</TableCell>
                          <TableCell className="px-4 text-right tabular-nums">
                            {CURRENCY.format(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
