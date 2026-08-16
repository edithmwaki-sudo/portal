"use client"

import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { FeeStructureForm } from "@/components/dashboard/fees/fee-structure-form";

export default function CreateFeeStructurePage() {
  const router = useRouter();

  return (
    <>
      <PageToolbar
        title="Add Fee Structure"
        description="Create a reusable fee structure with its line items."
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <FeeStructureForm
            onSuccess={() => router.push("/fees/structures")}
            onCancel={() => router.push("/fees/structures")}
          />
        </div>
      </div>
    </>
  );
}
