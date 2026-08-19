"use client"

import { useEffect, useState } from "react";
import { FilePlus2, Search, Undo2 } from "lucide-react";
import Link from "next/link";
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
import { getInvoices, reverseInvoice, type Invoice } from "@/lib/api/finance";
import { hasAnyPermission, usePermissions } from "@/hooks/use-current-user";

const CURRENCY = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

type StatusFilter = "all" | "ISSUED" | "PARTIAL" | "PAID" | "CANCELLED";

export default function InvoicesPage() {
  const { permissions } = usePermissions();
  const canManage = hasAnyPermission(permissions, ["invoice.manage"]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [refresh, setRefresh] = useState(0);
  const [toReverse, setToReverse] = useState<Invoice | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      getInvoices({
        page: 1,
        limit: 100,
        search: query.trim() || undefined,
        status: status === "all" ? undefined : status,
      })
        .then((data) => {
          if (!cancelled) setInvoices(data.items);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load invoices. Please try again.");
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
      await reverseInvoice(toReverse.id, reverseReason.trim());
      toast.success(`Invoice ${toReverse.invoiceNumber} reversed`);
      setToReverse(null);
      setReverseReason("");
      setRefresh((value) => value + 1);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.status === 400
          ? (err.response.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? "Failed to reverse invoice. Please try again.");
    } finally {
      setReversing(false);
    }
  }

  return (
    <>
      <PageToolbar
        title="Invoices"
        description="Issue, view, and reverse student invoices."
        primaryActions={[
          {
            label: "Issue Invoice",
            icon: FilePlus2,
            href: "/invoices/issue",
          },
          {
            label: "Ad-hoc Invoice",
            icon: FilePlus2,
            href: "/invoices/adhoc",
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
              placeholder="Search by invoice number, student, or admission number..."
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
                <SelectItem value="ISSUED">Issued</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Invoice No.</TableHead>
                <TableHead className="px-4">Student</TableHead>
                <TableHead className="px-4">Adm No.</TableHead>
                <TableHead className="px-4">Type</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4 text-right">Amount</TableHead>
                <TableHead className="px-4 text-right">Balance</TableHead>
                <TableHead className="px-4">Due Date</TableHead>
                <TableHead className="px-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 10 }).map((__, col) => (
                      <TableCell key={col} className="px-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim() || status !== "all"
                      ? "No invoices match your filters."
                      : 'No invoices yet. Click "Issue Invoice" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice, index) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4 font-medium">
                      <Link
                        href={`/invoices/view?id=${invoice.id}`}
                        className="hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4">{invoice.studentName ?? "—"}</TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {invoice.studentAdmissionNumber ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      {invoice.type === "ADHOC"
                        ? `Ad-hoc (${invoice.chargeType ?? ""})`
                        : "Template"}
                    </TableCell>
                    <TableCell className="px-4">
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="px-4 text-right tabular-nums">
                      {CURRENCY.format(invoice.computedAmount)}
                    </TableCell>
                    <TableCell className="px-4 text-right tabular-nums">
                      {CURRENCY.format(invoice.balance)}
                    </TableCell>
                    <TableCell className="px-4">
                      {invoice.dueDate?.slice(0, 10)}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`View ${invoice.invoiceNumber}`}
                          asChild
                        >
                          <Link href={`/invoices/view?id=${invoice.id}`}>
                            <Search />
                          </Link>
                        </Button>
                        {canManage && invoice.status !== "CANCELLED" && (
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            aria-label={`Reverse ${invoice.invoiceNumber}`}
                            onClick={() => {
                              setToReverse(invoice);
                              setReverseReason("");
                            }}
                          >
                            <Undo2 />
                          </Button>
                        )}
                      </div>
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
            <AlertDialogTitle>Reverse invoice {toReverse?.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invoice and post a reversing ledger entry.
              Any payments already allocated to it will be returned to the
              student&apos;s unallocated credit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Reason</label>
            <Input
              value={reverseReason}
              onChange={(event) => setReverseReason(event.target.value)}
              placeholder="Why is this invoice being reversed?"
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
              {reversing ? "Reversing..." : "Reverse Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
