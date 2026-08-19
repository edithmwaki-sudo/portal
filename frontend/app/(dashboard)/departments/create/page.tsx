"use client"

import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { DepartmentForm } from "@/components/dashboard/departments/department-form";

export default function CreateDepartmentPage() {
  const router = useRouter();

  return (
    <>
      <PageToolbar
        title="Add Department"
        description="Create an institutional department."
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <DepartmentForm
            onSuccess={() => router.push("/departments")}
            onCancel={() => router.push("/departments")}
          />
        </div>
      </div>
    </>
  );
}