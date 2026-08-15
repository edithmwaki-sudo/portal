"use client"

import { useEffect, useState } from "react";
import { ArrowLeft, Undo2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { PaymentStatusBadge } from "@/components/dashboard/finance/status-badges";
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
  getPayment,
  reversePayment,
  type Payment,
  type PaymentMethod,
} from "@/lib/api/finance";
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

export default function PaymentViewPage() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));
  const { permissions } = usePermissions();
  const canManage = hasAnyPermission(permissions, ["payment.manage"]);
  const invalid = !id;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReverse, setShowReverse] = useState(false);
  const [reason, setReason] = useState("");
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPayment(id)
      .then((result) => {
        if (!cancelled) setPayment(result);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the payment. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleReverse() {
    if (!payment || !reason.trim()) return;
    setReversing(true);
    try {
      const updated = await reversePayment(payment.id, reason.trim());
      setPayment(updated);
      setShowReverse(false);
      setReason("");
      toast.success("Payment reversed");
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response
          ? (err.response.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? "Failed to reverse the payment.", { duration: 6000 });
    } finally {
      setReversing(false);
    }
  }

  const allocated = payment?.allocations?.reduce(
    (sum, allocation) => sum + Number(allocation.amount),
    0
  ) ?? 0;

  return (
    <>
      <PageToolbar
        title={payment ? payment.reference ?? `Payment #${payment.id}` : "Payment"}
        description={payment ? `Student: ${payment.studentName ?? "—"}` : "Loading..."}
        quickLinks={[{ label: "Back to Payments", href: "/payments" }]}
        primaryActions={
          canManage && payment && payment.status !== "REVERSED"
            ? [
                {
                  label: "Reverse Payment",
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
      <div className="mx-[50px] mb-[30px] grid gap-6">
        {invalid ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-lg shadow-black/5">
            <p className="text-sm text-muted-foreground">Missing payment id.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/payments">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Payments
              </Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="grid gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-48" />
          </div>
        ) : error || !payment ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-lg shadow-black/5">
            <p className="text-sm text-muted-foreground">{error ?? "Not found"}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/payments">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Payments
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 rounded-lg bg-white p-6 shadow-lg shadow-black/5 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  <PaymentStatusBadge status={payment.status} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Method</p>
                <p className="mt-1 text-sm font-medium">
                  {METHOD_LABELS[payment.method] ?? payment.method}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {CURRENCY.format(payment.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="mt-1 text-sm font-medium">
                  {payment.paymentDate?.slice(0, 10)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Adm No.</p>
                <p className="mt-1 text-sm font-medium">
                  {payment.studentAdmissionNumber ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Session</p>
                <p className="mt-1 text-sm font-medium">
                  {payment.academicSessionName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Allocated</p>
                <p className="mt-1 text-sm font-medium tabular-nums">
                  {CURRENCY.format(allocated)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unallocated</p>
                <p className="mt-1 text-sm font-medium tabular-nums">
                  {CURRENCY.format(Math.max(payment.amount - allocated, 0))}
                </p>
              </div>
              {payment.reversalReason ? (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Reversal reason
                  </p>
                  <p className="mt-1 text-sm">{payment.reversalReason}</p>
                </div>
              ) : null}
              {payment.notes ? (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm">{payment.notes}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg bg-white shadow-lg shadow-black/5">
              <div className="border-b px-6 py-4">
                <h2 className="text-base font-semibold">Allocations</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6">Invoice</TableHead>
                    <TableHead className="px-6 text-right">Allocated</TableHead>
                    <TableHead className="px-6">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!payment.allocations || payment.allocations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="px-6 py-8 text-center text-sm text-muted-foreground"
                      >
                        No allocations — the full amount remains as credit on
                        account.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payment.allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="px-6 font-medium">
                          <Link
                            href={`/invoices/view?id=${allocation.invoiceId}`}
                            className="hover:underline"
                          >
                            {allocation.invoiceNumber ?? `Invoice #${allocation.invoiceId}`}
                          </Link>
                        </TableCell>
                        <TableCell className="px-6 text-right tabular-nums">
                          {CURRENCY.format(allocation.amount)}
                        </TableCell>
                        <TableCell className="px-6">
                          {allocation.allocatedAt?.slice(0, 10)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
      <AlertDialog open={showReverse} onOpenChange={setShowReverse}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              The payment will be marked reversed and its allocations returned to
              the student&apos;s unallocated credit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Reason</label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this payment being reversed?"
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
              {reversing ? "Reversing..." : "Reverse Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
