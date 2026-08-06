"use client"

import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StaffForm } from "@/components/dashboard/users/staff-form";

export default function CreateStaffPage() {
  const router = useRouter();

  return (
    <>
      <PageToolbar
        title="Add Staff"
        description="Onboard a staff member and create their account and employment record."
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-white p-6 shadow-lg shadow-black/5">
          <StaffForm
            onSuccess={() => router.push("/staff")}
            onCancel={() => router.push("/staff")}
          />
        </div>
      </div>
    </>
  );
}
