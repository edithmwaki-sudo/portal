"use client"

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { RequiredLabel } from "@/components/dashboard/required-label";
import { Button } from "@/components/ui/button";
import { AsyncSearchSelect } from "@/components/ui/async-search-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStudents } from "@/lib/api/students";
import {
  getInvoicePreview,
  issueInvoice,
  type InvoicePreview,
} from "@/lib/api/finance";

const CURRENCY = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

export default function IssueInvoicePage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<number | undefined>();
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchStudentOptions = useCallback((search: string) => {
    return getStudents({ page: 1, limit: 10, search }).then((response) =>
      response.items.map((student) => ({
        id: student.id,
        label: `${student.user.name ?? "Student"} (${
          student.admissionNumber ?? "no admission no."
        })`,
      }))
    );
  }, []);

  async function handleStudentChange(next?: string) {
    const id = next ? Number(next) : undefined;
    setStudentId(id);
    setPreview(null);
    setPreviewError(null);
    if (!id) return;
    setLoadingPreview(true);
    try {
      const result = await getInvoicePreview(id);
      setPreview(result);
    } catch (err) {
      setPreview(null);
      const message =
        axios.isAxiosError(err) && err.response?.status === 400
          ? (err.response.data as { message?: string })?.message
          : undefined;
      setPreviewError(message ?? "Could not load the invoice preview.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleIssue() {
    if (!studentId) return;
    setSubmitting(true);
    try {
      const invoice = await issueInvoice(studentId);
      toast.success(`Invoice ${invoice.invoiceNumber} issued`);
      router.push(`/invoices/view?id=${invoice.id}`);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.status === 409
          ? (err.response.data as { message?: string })?.message
          : undefined;
      toast.error(
        message ??
          "Failed to issue the invoice. Check that the student has an active fee assignment.",
        { duration: 6000 }
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageToolbar
        title="Issue Invoice"
        description="Issue a fee invoice to a student from their assigned fee structure."
        quickLinks={[{ label: "Back to Invoices", href: "/invoices" }]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px] max-w-3xl">
        <div className="grid gap-6">
          <div className="rounded-lg bg-card p-6 shadow-lg shadow-black/5">
            <div className="grid gap-2">
              <RequiredLabel>Student</RequiredLabel>
              <AsyncSearchSelect
                value={studentId?.toString() ?? ""}
                onValueChange={(next) => {
                  setSelectedLabel(undefined);
                  handleStudentChange(next);
                }}
                getOptions={fetchStudentOptions}
                selectedLabel={selectedLabel}
                placeholder="Select a student"
                searchPlaceholder="Search by name or admission number..."
                minChars={1}
              />
            </div>
          </div>

          {loadingPreview ? (
            <div className="grid gap-3 rounded-lg bg-card p-6 shadow-lg shadow-black/5">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading fee preview...
              </p>
            </div>
          ) : previewError ? (
            <div className="rounded-lg bg-card p-6 text-sm text-muted-foreground shadow-lg shadow-black/5">
              {previewError}
            </div>
          ) : preview ? (
            <div className="rounded-lg bg-card shadow-lg shadow-black/5">
              <div className="border-b px-6 py-4">
                <h2 className="text-lg font-semibold">
                  {preview.feeStructureName ?? "Fee preview"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {preview.academicSessionName ??
                    "No academic session"}{" "}
                  {"—"} due {preview.dueDate?.slice(0, 10) ?? "not set"}
                </p>
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
                  {preview.items.map((item) => (
                    <TableRow key={item.feeItemId}>
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
                      {CURRENCY.format(preview.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex items-center justify-end gap-2 px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/invoices")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleIssue} disabled={submitting || !studentId}>
                  {submitting && <Loader2 className="animate-spin" />}
                  {submitting ? "Issuing..." : "Issue Invoice"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
