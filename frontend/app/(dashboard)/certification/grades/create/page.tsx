"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { GradeForm } from "@/components/dashboard/certifications/grade-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCertificationAuthority } from "@/lib/api/certifications";

export default function CreateGradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authorityIdParam = searchParams.get("authorityId");
  const authorityId = authorityIdParam ? Number(authorityIdParam) : undefined;

  const [authorityName, setAuthorityName] = useState<string | undefined>();
  const [loadingAuthority, setLoadingAuthority] = useState(Boolean(authorityId));

  useEffect(() => {
    if (!authorityId) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      getCertificationAuthority(authorityId)
        .then((authority) => {
          if (!cancelled) setAuthorityName(authority.name);
        })
        .catch(() => {
          if (!cancelled) setAuthorityName(undefined);
        })
        .finally(() => {
          if (!cancelled) setLoadingAuthority(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authorityId]);

  const backHref = authorityId
    ? `/certification/grades?authorityId=${authorityId}`
    : "/certification/authorities";

  return (
    <>
      <PageToolbar
        title="Add Grade"
        description={
          authorityName
            ? `Add a grade range for ${authorityName}.`
            : "Add a grade range for a certification authority."
        }
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!authorityId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing certification authority. Select an authority first.
            </p>
          ) : loadingAuthority ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <GradeForm
              certificationAuthorityId={authorityId}
              onSuccess={() => router.push(backHref)}
              onCancel={() => router.push(backHref)}
            />
          )}
        </div>
      </div>
    </>
  );
}