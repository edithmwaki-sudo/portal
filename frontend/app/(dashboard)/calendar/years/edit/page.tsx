"use client"

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { AcademicYearForm } from "@/components/dashboard/calendar/academic-year-form";
import { DeleteAcademicYearDialog } from "@/components/dashboard/calendar/delete-academic-year-dialog";
import { Button } from "@/components/ui/button";
import { getAcademicYear, type AcademicYear } from "@/lib/api/academic-years";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function EditAcademicYearPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canEdit = hasAnyPermission(permissions, ["academic_year.edit"]);
  const canDelete = hasAnyPermission(permissions, ["academic_year.delete"]);

  const [year, setYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!id || (permissionsLoading && !canEdit)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAcademicYear(id)
      .then((data) => {
        if (!cancelled) setYear(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the academic year.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, permissionsLoading, canEdit, refresh]);

  if (!permissionsLoading && !canEdit) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to edit academic years.
      </p>
    );
  }

  return (
    <>
      <PageToolbar
        title="Edit Academic Year"
        description={year ? `${year.code} ${year.name}`.trim() : "Update an academic year."}
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
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing academic year id.
            </p>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading academic year...
            </p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : !year ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Academic year not found.
            </p>
          ) : (
            <>
              <AcademicYearForm
                year={year}
                onSuccess={() => router.push("/calendar")}
                onCancel={() => router.push("/calendar")}
              />
              {canDelete && (
                <div className="mt-8 border-t pt-6">
                  <DeleteAcademicYearDialog
                    year={year}
                    open={!!yearToDelete}
                    onOpenChange={(open) => {
                      if (!open) setYearToDelete(null);
                    }}
                    onDeleted={() => router.push("/calendar")}
                  />
                  <Button
                    variant="destructive"
                    onClick={() => setYearToDelete(year)}
                  >
                    Delete Academic Year
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
