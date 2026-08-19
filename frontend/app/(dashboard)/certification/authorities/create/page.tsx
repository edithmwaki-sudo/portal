"use client"

import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { AuthorityForm } from "@/components/dashboard/certifications/authority-form";

export default function CreateAuthorityPage() {
  const router = useRouter();

  return (
    <>
      <PageToolbar
        title="Add Certification Authority"
        description="Create a certification authority (e.g. an examination body)."
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <AuthorityForm
            onSuccess={() => router.push("/certification/authorities")}
            onCancel={() => router.push("/certification/authorities")}
          />
        </div>
      </div>
    </>
  );
}