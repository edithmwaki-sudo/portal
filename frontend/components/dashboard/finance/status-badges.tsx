import { cn } from "@/lib/utils";

export function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ISSUED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    PARTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    PAID: "bg-primary/10 text-primary",
    CANCELLED: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    ISSUED: "Issued",
    PARTIAL: "Partial",
    PAID: "Paid",
    CANCELLED: "Cancelled",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: "bg-primary/10 text-primary",
    REVERSED: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    COMPLETED: "Completed",
    REVERSED: "Reversed",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
