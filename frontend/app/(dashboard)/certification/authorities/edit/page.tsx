"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { AuthorityForm } from "@/components/dashboard/certifications/authority-form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCertificationAuthority,
  type CertificationAuthority,
} from "@/lib/api/certifications";

export default function EditAuthorityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;

  const [authority, setAuthority] = useState<CertificationAuthority | null>(
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
      getCertificationAuthority(id)
        .then((data) => {
          if (!cancelled) setAuthority(data);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load the authority.");
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
        title="Edit Certification Authority"
        description="Update the authority&apos;s details."
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing authority id.
            </p>
          ) : loading ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : authority ? (
            <AuthorityForm
              key={authority.id}
              authority={authority}
              onSuccess={() => router.push("/certification/authorities")}
              onCancel={() => router.push("/certification/authorities")}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}