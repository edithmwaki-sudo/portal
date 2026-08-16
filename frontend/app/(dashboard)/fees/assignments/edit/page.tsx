"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { CourseFeeAssignmentForm } from "@/components/dashboard/fees/course-fee-assignment-form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCourseFeeAssignment,
  type CourseFeeAssignment,
} from "@/lib/api/fees";

export default function EditCourseFeeAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;

  const [assignment, setAssignment] = useState<CourseFeeAssignment | null>(
    null
  );
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
      getCourseFeeAssignment(id)
        .then((data) => {
          if (!cancelled) setAssignment(data);
        })
        .catch(() => {
          if (!cancelled)
            setError("Failed to load the course fee assignment.");
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
        title="Edit Course Fee Assignment"
        description="Update the fee structure, dates or status of this assignment."
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing assignment id.
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
          ) : assignment ? (
            <CourseFeeAssignmentForm
              key={assignment.id}
              assignment={assignment}
              onSuccess={() => router.push("/fees/assignments")}
              onCancel={() => router.push("/fees/assignments")}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
