"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { LevelForm } from "@/components/dashboard/certifications/level-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCertificationAuthority } from "@/lib/api/certifications";

export default function CreateLevelPage() {
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
        title="Add Certification Level"
        description={
          authorityName
            ? `Add a level under ${authorityName}.`
            : "Add a level under a certification authority."
        }
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-white p-6 shadow-lg shadow-black/5">
          {loadingAuthority ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <LevelForm
              presetAuthority={presetAuthority}
              onSuccess={() =>
                router.push(
                  authorityId
                    ? `/certification/levels?authorityId=${authorityId}`
                    : "/certification/levels"
                )
              }
              onCancel={() =>
                router.push(
                  authorityId
                    ? `/certification/levels?authorityId=${authorityId}`
                    : "/certification/levels"
                )
              }
            />
          )}
        </div>
      </div>
    </>
  );
}