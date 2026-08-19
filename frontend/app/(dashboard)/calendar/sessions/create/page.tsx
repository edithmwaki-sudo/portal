"use client"

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { AcademicSessionForm } from "@/components/dashboard/calendar/academic-session-form";
import { getAcademicYear, type AcademicYear } from "@/lib/api/academic-years";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function CreateAcademicSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearId = Number(searchParams.get("yearId")) || undefined;

  const { permissions, loading: permissionsLoading } = usePermissions();
  const canAdd = hasAnyPermission(permissions, ["academic_session.add"]);

  const [year, setYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(Boolean(yearId));

  useEffect(() => {
    if (!yearId) return;
    let cancelled = false;
    setLoading(true);
    getAcademicYear(yearId)
      .then((data) => {
        if (!cancelled) setYear(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [yearId]);

  if (!permissionsLoading && !canAdd) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to add academic sessions.
      </p>
    );
  }

  const backHref = yearId ? `/calendar/sessions?yearId=${yearId}` : "/calendar";

  return (
    <>
      <PageToolbar
        title="Add Academic Session"
        description={
          year ? `New session in ${year.code} ${year.name}.` : "Add a session."
        }
        primaryActions={[
          {
            label: "Back to Sessions",
            icon: ArrowLeft,
            href: backHref,
            variant: "outline",
          },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!yearId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing academic year. Open a year from the calendar to add a
              session.
            </p>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading academic year...
            </p>
          ) : (
            <AcademicSessionForm
              academicYearId={yearId}
              onSuccess={() =>
                router.push(`/calendar/sessions?yearId=${yearId}`)
              }
              onCancel={() => router.push(backHref)}
            />
          )}
        </div>
      </div>
    </>
  );
}
