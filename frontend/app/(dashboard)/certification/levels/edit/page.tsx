"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { LevelForm } from "@/components/dashboard/certifications/level-form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCertificationLevel,
  type CertificationLevel,
} from "@/lib/api/certifications";

export default function EditLevelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;

  const [level, setLevel] = useState<CertificationLevel | null>(null);
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
      getCertificationLevel(id)
        .then((data) => {
          if (!cancelled) setLevel(data);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load the level.");
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

  const backHref = level?.certificationAuthorityId
    ? `/certification/levels?authorityId=${level.certificationAuthorityId}`
    : "/certification/levels";

  return (
    <>
      <PageToolbar
        title="Edit Certification Level"
        description="Update the level&apos;s details."
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing level id.
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
          ) : level ? (
            <LevelForm
              key={level.id}
              level={level}
              onSuccess={() => router.push(backHref)}
              onCancel={() => router.push(backHref)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}