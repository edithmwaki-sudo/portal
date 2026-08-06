"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { GradeForm } from "@/components/dashboard/certifications/grade-form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCertificationGrade,
  type CertificationGrade,
} from "@/lib/api/certifications";

export default function EditGradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;
  const authorityIdParam = searchParams.get("authorityId");
  const authorityId = authorityIdParam ? Number(authorityIdParam) : undefined;

  const [grade, setGrade] = useState<CertificationGrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !authorityId) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getCertificationGrade(authorityId, id)
        .then((data) => {
          if (!cancelled) setGrade(data);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load the grade.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, authorityId]);

  const backHref = authorityId
    ? `/certification/grades?authorityId=${authorityId}`
    : "/certification/authorities";

  return (
    <>
      <PageToolbar
        title="Edit Grade"
        description="Update the grade range details."
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-white p-6 shadow-lg shadow-black/5">
          {!id || !authorityId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing grade or authority id.
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
          ) : grade ? (
            <GradeForm
              key={grade.id}
              certificationAuthorityId={authorityId}
              grade={grade}
              onSuccess={() => router.push(backHref)}
              onCancel={() => router.push(backHref)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}