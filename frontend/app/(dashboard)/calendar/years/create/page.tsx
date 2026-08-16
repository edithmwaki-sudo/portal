"use client"

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { AcademicYearForm } from "@/components/dashboard/calendar/academic-year-form";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function CreateAcademicYearPage() {
  const router = useRouter();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canAdd = hasAnyPermission(permissions, ["academic_year.add"]);

  if (!permissionsLoading && !canAdd) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to add academic years.
      </p>
    );
  }

  return (
    <>
      <PageToolbar
        title="Add Academic Year"
        description="Create an academic year with its sessions."
        primaryActions={[
          {
            label: "Back to Calendar",
            icon: ArrowLeft,
            href: "/calendar",
            variant: "outline",
          },
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <AcademicYearForm
            onSuccess={() => router.push("/calendar")}
            onCancel={() => router.push("/calendar")}
          />
        </div>
      </div>
    </>
  );
}
