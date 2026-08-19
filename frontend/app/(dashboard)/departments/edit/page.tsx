"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { DepartmentForm } from "@/components/dashboard/departments/department-form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDepartment,
  type Department,
} from "@/lib/api/departments";

export default function EditDepartmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;

  const [department, setDepartment] = useState<Department | null>(null);
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
      getDepartment(id)
        .then((data) => {
          if (!cancelled) setDepartment(data);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load the department.");
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
        title="Edit Department"
        description="Update the department&apos;s details."
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing department id.
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
          ) : department ? (
            <DepartmentForm
              key={department.id}
              department={department}
              onSuccess={() => router.push("/departments")}
              onCancel={() => router.push("/departments")}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}