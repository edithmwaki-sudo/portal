"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { FeeStructureForm } from "@/components/dashboard/fees/fee-structure-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getFeeStructure, type FeeStructure } from "@/lib/api/fees";

export default function EditFeeStructurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;

  const [structure, setStructure] = useState<FeeStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getFeeStructure(id)
        .then((data) => {
          if (!cancelled) setStructure(data);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load the fee structure.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  return (
    <>
      <PageToolbar
        title="Edit Fee Structure"
        description="Update the fee structure and its line items."
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-white p-6 shadow-lg shadow-black/5">
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing fee structure id.
            </p>
          ) : loading ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : structure ? (
            <FeeStructureForm
              key={structure.id}
              structure={structure}
              onSuccess={() => router.push("/fees/structures")}
              onCancel={() => router.push("/fees/structures")}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
