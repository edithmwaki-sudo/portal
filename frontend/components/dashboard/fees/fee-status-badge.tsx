import { cn } from "@/lib/utils";
import type { FeeStatus } from "@/lib/api/fees";

export function FeeStatusBadge({ status }: { status: FeeStatus }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        active
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
