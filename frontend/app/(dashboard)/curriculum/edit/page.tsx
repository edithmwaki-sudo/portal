"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { CurriculumForm } from "@/components/dashboard/certifications/curriculum-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurriculum, type Curriculum } from "@/lib/api/curriculums";

export default function EditCurriculumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;

  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
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
      getCurriculum(id)
        .then((data) => {
          if (!cancelled) setCurriculum(data);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load the curriculum.");
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

  const backHref = curriculum?.certificationAuthorityId
    ? `/curriculum?authorityId=${curriculum.certificationAuthorityId}`
    : "/curriculum";

  return (
    <>
      <PageToolbar
        title="Edit Curriculum"
        description="Update the curriculum cycle&apos;s details."
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing curriculum id.
            </p>
          ) : loading ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : curriculum ? (
            <CurriculumForm
              key={curriculum.id}
              curriculum={curriculum}
              onSuccess={() => router.push(backHref)}
              onCancel={() => router.push(backHref)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}