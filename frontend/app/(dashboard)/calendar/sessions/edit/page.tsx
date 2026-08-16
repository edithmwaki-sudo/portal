"use client"

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { AcademicSessionForm } from "@/components/dashboard/calendar/academic-session-form";
import { DeleteAcademicSessionDialog } from "@/components/dashboard/calendar/delete-academic-session-dialog";
import { Button } from "@/components/ui/button";
import {
  getAcademicSession,
  type AcademicSession,
} from "@/lib/api/academic-sessions";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function EditAcademicSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;
  const yearId = Number(searchParams.get("yearId")) || undefined;

  const { permissions, loading: permissionsLoading } = usePermissions();
  const canEdit = hasAnyPermission(permissions, ["academic_session.edit"]);
  const canDelete = hasAnyPermission(permissions, ["academic_session.delete"]);

  const [session, setSession] = useState<AcademicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] =
    useState<AcademicSession | null>(null);

  useEffect(() => {
    if (!id || (permissionsLoading && !canEdit)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAcademicSession(id)
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the session.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, permissionsLoading, canEdit]);

  if (!permissionsLoading && !canEdit) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to edit academic sessions.
      </p>
    );
  }

  const backHref = session
    ? `/calendar/sessions?yearId=${session.academicYearId}`
    : yearId
      ? `/calendar/sessions?yearId=${yearId}`
      : "/calendar";

  return (
    <>
      <PageToolbar
        title="Edit Academic Session"
        description={session ? `${session.code} ${session.name}`.trim() : "Update a session."}
        primaryActions={[
          {
            label: "Back to Sessions",
            icon: ArrowLeft,
            href: backHref,
            variant: "outline",
          },
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing session id.
            </p>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading session...
            </p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : !session ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Session not found.
            </p>
          ) : (
            <>
              <AcademicSessionForm
                session={session}
                onSuccess={() => router.push(backHref)}
                onCancel={() => router.push(backHref)}
              />
              {canDelete && (
                <div className="mt-8 border-t pt-6">
                  <DeleteAcademicSessionDialog
                    session={session}
                    open={!!sessionToDelete}
                    onOpenChange={(open) => {
                      if (!open) setSessionToDelete(null);
                    }}
                    onDeleted={() => router.push(backHref)}
                  />
                  <Button
                    variant="destructive"
                    onClick={() => setSessionToDelete(session)}
                  >
                    Delete Session
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
