"use client"

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { InvoiceStatusBadge } from "@/components/dashboard/finance/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getInvoice,
  getStudentStatement,
  reverseInvoice,
  type Invoice,
  type StudentStatement,
} from "@/lib/api/finance";
import { hasAnyPermission, usePermissions } from "@/hooks/use-current-user";

const CURRENCY = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const ENTRY_LABELS: Record<string, string> = {
  INVOICE: "Invoice issued",
  INVOICE_REVERSAL: "Invoice reversed",
  PAYMENT: "Payment",
  PAYMENT_REVERSAL: "Payment reversed",
};

export default function InvoiceViewPage() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));
  const { permissions } = usePermissions();
  const canManage = hasAnyPermission(permissions, ["invoice.manage"]);
  const invalid = !id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [statement, setStatement] = useState<StudentStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReverse, setShowReverse] = useState(false);
  const [reason, setReason] = useState("");
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getInvoice(id)
      .then((result) => {
        if (cancelled) return;
        setInvoice(result);
        return getStudentStatement(result.studentId);
      })
      .then((stmt) => {
        if (!cancelled && stmt) setStatement(stmt);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the invoice. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleReverse() {
    if (!invoice || !reason.trim()) return;
    setReversing(true);
    try {
      const updated = await reverseInvoice(invoice.id, reason.trim());
      setInvoice(updated);
      setShowReverse(false);
      setReason("");
      toast.success(`Invoice ${updated.invoiceNumber} reversed`);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response
          ? (err.response.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? "Failed to reverse the invoice.", { duration: 6000 });
    } finally {
      setReversing(false);
    }
  }

  return (
    <>
      <PageToolbar
        title={invoice ? invoice.invoiceNumber : "Invoice"}
        description={invoice ? `Student: ${invoice.studentName ?? "—"}` : "Loading..."}
        quickLinks={[{ label: "Back to Invoices", href: "/invoices" }]}
        primaryActions={
          canManage && invoice && invoice.status !== "CANCELLED"
            ? [
                {
                  label: "Reverse Invoice",
                  icon: Undo2,
                  destructive: true,
                  onClick: () => {
                    setReason("");
                    setShowReverse(true);
                  },
                },
              ]
            : undefined
        }
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px] grid gap-4 sm:gap-6">
        {invalid ? (
          <div className="rounded-lg bg-card p-8 text-center shadow-lg shadow-black/5">
            <p className="text-sm text-muted-foreground">Missing invoice id.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/invoices">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoices
              </Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="grid gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
          </div>
        ) : error || !invoice ? (
          <div className="rounded-lg bg-card p-8 text-center shadow-lg shadow-black/5">
            <p className="text-sm text-muted-foreground">{error ?? "Not found"}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/invoices">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoices
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 rounded-lg bg-card p-6 shadow-lg shadow-black/5 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="mt-1 text-sm font-medium">
                  {invoice.type === "ADHOC"
                    ? `Ad-hoc (${invoice.chargeType ?? ""})`
                    : "Fee template"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Adm No.</p>
                <p className="mt-1 text-sm font-medium">
                  {invoice.studentAdmissionNumber ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Session</p>
                <p className="mt-1 text-sm font-medium">
                  {invoice.academicSessionName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Issued</p>
                <p className="mt-1 text-sm font-medium">
                  {invoice.issueDate?.slice(0, 10)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due</p>
                <p className="mt-1 text-sm font-medium">
                  {invoice.dueDate?.slice(0, 10)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {CURRENCY.format(invoice.computedAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Balance</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {CURRENCY.format(invoice.balance)}
                </p>
              </div>
              {invoice.reason ? (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Reversal reason
                  </p>
                  <p className="mt-1 text-sm">{invoice.reason}</p>
                </div>
              ) : null}
              {invoice.notes ? (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm">{invoice.notes}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg bg-card shadow-lg shadow-black/5">
              <div className="border-b px-6 py-4">
                <h2 className="text-base font-semibold">Line Items</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6">Item</TableHead>
                    <TableHead className="px-6 text-right">Amount</TableHead>
                    <TableHead className="px-6 text-right">Qty</TableHead>
                    <TableHead className="px-6 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-6">{item.itemName}</TableCell>
                      <TableCell className="px-6 text-right tabular-nums">
                        {CURRENCY.format(item.amount)}
                      </TableCell>
                      <TableCell className="px-6 text-right tabular-nums">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="px-6 text-right tabular-nums">
                        {CURRENCY.format(item.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="px-6 text-right font-medium">
                      Total
                    </TableCell>
                    <TableCell className="px-6 text-right font-semibold tabular-nums">
                      {CURRENCY.format(invoice.computedAmount)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="rounded-lg bg-card shadow-lg shadow-black/5">
              <div className="grid gap-4 border-b px-6 py-4 sm:grid-cols-4">
                <h2 className="text-base font-semibold sm:col-span-4">
                  Student Fee Statement
                </h2>
                {statement ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Invoiced
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {CURRENCY.format(statement.totals.invoiced)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Paid</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {CURRENCY.format(statement.totals.paid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Balance
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {CURRENCY.format(statement.totals.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Unallocated credit
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {CURRENCY.format(statement.totals.unallocated)}
                      </p>
                    </div>
                  </>
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {statement ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">Date</TableHead>
                      <TableHead className="px-6">Type</TableHead>
                      <TableHead className="px-6">Reference</TableHead>
                      <TableHead className="px-6">Description</TableHead>
                      <TableHead className="px-6 text-right">Debit</TableHead>
                      <TableHead className="px-6 text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.entries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="px-6 py-8 text-center text-sm text-muted-foreground"
                        >
                          No ledger entries.
                        </TableCell>
                      </TableRow>
                    ) : (
                      statement.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="px-6">
                            {entry.transactionDate?.slice(0, 10)}
                          </TableCell>
                          <TableCell className="px-6">
                            {ENTRY_LABELS[entry.type] ?? entry.type}
                          </TableCell>
                          <TableCell className="px-6 font-medium">
                            {entry.reference ?? "—"}
                          </TableCell>
                          <TableCell className="px-6 text-muted-foreground">
                            {entry.description ?? "—"}
                          </TableCell>
                          <TableCell className="px-6 text-right tabular-nums">
                            {entry.debit ? CURRENCY.format(entry.debit) : "—"}
                          </TableCell>
                          <TableCell className="px-6 text-right tabular-nums">
                            {entry.credit ? CURRENCY.format(entry.credit) : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : null}
            </div>
          </>
        )}
      </div>
      <AlertDialog open={showReverse} onOpenChange={setShowReverse}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse invoice {invoice?.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice will be cancelled and a reversing ledger entry posted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Reason</label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this invoice being reversed?"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim() || reversing}
              onClick={(event) => {
                event.preventDefault();
                handleReverse();
              }}
            >
              {reversing ? "Reversing..." : "Reverse Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
