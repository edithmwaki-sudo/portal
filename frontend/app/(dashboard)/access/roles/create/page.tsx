"use client"

import { useRouter } from "next/navigation";

import { RolesToolbar } from "@/components/dashboard/roles/roles-toolbar";
import { RoleForm } from "@/components/dashboard/roles/role-form";

export default function CreateRolePage() {
  const router = useRouter();

  return (
    <>
      <RolesToolbar />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <RoleForm
            onSuccess={() => router.push("/access/roles")}
            onCancel={() => router.push("/access/roles")}
          />
        </div>
      </div>
    </>
  );
}
