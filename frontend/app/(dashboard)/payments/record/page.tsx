"use client"

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { RequiredLabel } from "@/components/dashboard/required-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AsyncSearchSelect } from "@/components/ui/async-search-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStudents } from "@/lib/api/students";
import { createPayment, type PaymentMethod } from "@/lib/api/finance";

export default function RecordPaymentPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<number | undefined>();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
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

  async function handleSubmit() {
    if (!studentId) {
      toast.error("Please select a student.");
      return;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    if (!paymentDate) {
      toast.error("Select a payment date.");
      return;
    }
    setSubmitting(true);
    try {
      const payment = await createPayment({
        studentId,
        amount: numericAmount,
        paymentDate,
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Payment recorded successfully");
      router.push(`/payments/view?id=${payment.id}`);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          (err.response.data as { message?: string })?.message ??
            "A payment with this reference already exists.",
          { duration: 6000 }
        );
      } else {
        toast.error("Failed to record the payment. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageToolbar
        title="Record Payment"
        description="Record a payment and allocate it to the student's outstanding invoices."
        quickLinks={[{ label: "Back to Payments", href: "/payments" }]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px] max-w-3xl">
        <div className="grid gap-6">
          <div className="grid gap-4 rounded-lg bg-card p-6 shadow-lg shadow-black/5 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <RequiredLabel>Student</RequiredLabel>
              <AsyncSearchSelect
                value={studentId?.toString() ?? ""}
                onValueChange={(next) =>
                  setStudentId(next ? Number(next) : undefined)
                }
                getOptions={fetchStudentOptions}
                placeholder="Select a student"
                searchPlaceholder="Search by name or admission number..."
                minChars={1}
              />
            </div>
            <div className="grid gap-2">
              <RequiredLabel>Amount (KES)</RequiredLabel>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <RequiredLabel>Payment Method</RequiredLabel>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="M_PESA">M-Pesa</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <RequiredLabel>Payment Date</RequiredLabel>
              <Input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Reference</label>
              <Input
                placeholder="e.g. M-Pesa code or bank ref"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                rows={3}
                placeholder="Optional notes about this payment"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2 md:col-span-2">
              <Button
                variant="outline"
                onClick={() => router.push("/payments")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                {submitting ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
