"use client"

import { useEffect, useState } from "react";
import { Eye, MoreHorizontal, Plus, Search, Undo2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { PaymentStatusBadge } from "@/components/dashboard/finance/status-badges";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  getPayments,
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

type StatusFilter = "all" | "COMPLETED" | "REVERSED";

export default function PaymentsPage() {
  const { permissions } = usePermissions();
  const canManage = hasAnyPermission(permissions, ["payment.manage"]);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [refresh, setRefresh] = useState(0);
  const [toReverse, setToReverse] = useState<Payment | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      getPayments({
        page: 1,
        limit: 100,
        search: query.trim() || undefined,
        status: status === "all" ? undefined : status,
      })
        .then((data) => {
          if (!cancelled) setPayments(data.items);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load payments. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, status, refresh]);

  async function handleReverse() {
    if (!toReverse || !reverseReason.trim()) return;
    setReversing(true);
    try {
      await reversePayment(toReverse.id, reverseReason.trim());
      toast.success("Payment reversed");
      setToReverse(null);
      setReverseReason("");
      setRefresh((value) => value + 1);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response
          ? (err.response.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? "Failed to reverse the payment. Please try again.", {
        duration: 6000,
      });
    } finally {
      setReversing(false);
    }
  }

  return (
    <>
      <PageToolbar
        title="Payments"
        description="Record and review payments made by students."
        primaryActions={[
          {
            label: "Record Payment",
            icon: Plus,
            href: "/payments/record",
          },
        ]}
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
              placeholder="Search by reference, student, or admission number..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as StatusFilter)}
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Reference</TableHead>
                <TableHead className="px-4">Student</TableHead>
                <TableHead className="px-4">Adm No.</TableHead>
                <TableHead className="px-4">Method</TableHead>
                <TableHead className="px-4">Date</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4 text-right">Amount</TableHead>
                <TableHead className="w-12 px-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 9 }).map((__, col) => (
                      <TableCell key={col} className="px-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim() || status !== "all"
                      ? "No payments match your filters."
                      : 'No payments yet. Click "Record Payment" to add one.'}
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment, index) => (
                  <TableRow key={payment.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4 font-medium">
                      <Link
                        href={`/payments/view?id=${payment.id}`}
                        className="hover:underline"
                      >
                        {payment.reference ?? `Payment #${payment.id}`}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4">{payment.studentName ?? "—"}</TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {payment.studentAdmissionNumber ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      {METHOD_LABELS[payment.method] ?? payment.method}
                    </TableCell>
                    <TableCell className="px-4">
                      {payment.paymentDate?.slice(0, 10)}
                    </TableCell>
                    <TableCell className="px-4">
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="px-4 text-right tabular-nums">
                      {CURRENCY.format(payment.amount)}
                    </TableCell>
                    <TableCell className="px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for payment ${payment.id}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/payments/view?id=${payment.id}`}>
                              <Eye />
                              View
                            </Link>
                          </DropdownMenuItem>
                          {canManage && payment.status !== "REVERSED" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => {
                                  setToReverse(payment);
                                  setReverseReason("");
                                }}
                              >
                                <Undo2 />
                                Reverse
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog
        open={!!toReverse}
        onOpenChange={(open) => {
          if (!open) setToReverse(null);
        }}
      >
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
              value={reverseReason}
              onChange={(event) => setReverseReason(event.target.value)}
              placeholder="Why is this payment being reversed?"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reverseReason.trim() || reversing}
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
