"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { CurriculumForm } from "@/components/dashboard/certifications/curriculum-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCertificationAuthority } from "@/lib/api/certifications";

export default function CreateCurriculumPage() {
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

  const presetAuthority =
    authorityId && authorityName
      ? { id: authorityId, name: authorityName }
      : null;

  return (
    <>
      <PageToolbar
        title="Add Curriculum"
        description={
          authorityName
            ? `Add a curriculum cycle under ${authorityName}.`
            : "Add a curriculum cycle for a certification authority."
        }
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-white p-6 shadow-lg shadow-black/5">
          {loadingAuthority ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <CurriculumForm
              presetAuthority={presetAuthority}
              onSuccess={() =>
                router.push(
                  authorityId
                    ? `/curriculum?authorityId=${authorityId}`
                    : "/curriculum"
                )
              }
              onCancel={() =>
                router.push(
                  authorityId
                    ? `/curriculum?authorityId=${authorityId}`
                    : "/curriculum"
                )
              }
            />
          )}
        </div>
      </div>
    </>
  );
}