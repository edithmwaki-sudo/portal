"use client"

import { useCallback, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import {
  createAdhocInvoice,
  type AdhocChargeType,
} from "@/lib/api/finance";

const CURRENCY = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

interface Line {
  itemName: string;
  amount: string;
}

export default function AdhocInvoicePage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<number | undefined>();
  const [chargeType, setChargeType] = useState<AdhocChargeType>("FINE");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ itemName: "", amount: "" }]);
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

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  const total = lines.reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    0
  );

  async function handleSubmit() {
    const items = lines
      .filter((line) => line.itemName.trim())
      .map((line) => ({
        itemName: line.itemName.trim(),
        amount: Number(line.amount),
      }));
    if (!studentId) {
      toast.error("Please select a student.");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one line item.");
      return;
    }
    setSubmitting(true);
    try {
      const invoice = await createAdhocInvoice({
        studentId,
        chargeType,
        items,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`Invoice ${invoice.invoiceNumber} issued`);
      router.push(`/invoices/view?id=${invoice.id}`);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response
          ? (err.response.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? "Failed to issue the ad-hoc invoice. Please try again.", {
        duration: 6000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageToolbar
        title="Ad-hoc Invoice"
        description="Issue an ad-hoc charge such as a fine, penalty, or hostel fee."
        quickLinks={[{ label: "Back to Invoices", href: "/invoices" }]}
      />
      <div className="mx-[50px] mb-[30px] max-w-3xl">
        <div className="grid gap-6">
          <div className="grid gap-4 rounded-lg bg-white p-6 shadow-lg shadow-black/5 md:grid-cols-2">
            <div className="grid gap-2">
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
              <RequiredLabel>Charge Type</RequiredLabel>
              <Select
                value={chargeType}
                onValueChange={(value) => setChargeType(value as AdhocChargeType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FINE">Fine</SelectItem>
                  <SelectItem value="PENALTY">Penalty</SelectItem>
                  <SelectItem value="HOSTEL">Hostel</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg shadow-black/5">
            <h2 className="mb-4 text-base font-semibold">Line Items</h2>
            <div className="grid gap-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                  <Input
                    className="sm:col-span-7"
                    placeholder="Item name"
                    value={line.itemName}
                    onChange={(event) =>
                      updateLine(index, { itemName: event.target.value })
                    }
                  />
                  <Input
                    className="sm:col-span-3"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={line.amount}
                    onChange={(event) =>
                      updateLine(index, { amount: event.target.value })
                    }
                  />
                  <Button
                    className="sm:col-span-2"
                    size="icon"
                    variant="outline"
                    aria-label={`Remove item ${index + 1}`}
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((current) => [...current, { itemName: "", amount: "" }])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
              <p className="text-sm font-medium">
                Total:{" "}
                <span className="font-semibold tabular-nums">
                  {CURRENCY.format(total)}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg shadow-black/5">
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <Textarea
              rows={3}
              placeholder="Optional notes about this charge"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/invoices")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                {submitting ? "Issuing..." : "Issue Ad-hoc Invoice"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
