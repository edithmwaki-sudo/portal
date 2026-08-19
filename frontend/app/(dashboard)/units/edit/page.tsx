"use client"

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { UnitForm } from "@/components/dashboard/units/unit-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getCourse, type Course } from "@/lib/api/courses";
import { getUnit, type Unit } from "@/lib/api/units";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function EditUnitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;

  const { permissions, loading: permissionsLoading } = usePermissions();
  const canEdit = hasAnyPermission(permissions, ["unit.edit"]);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
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
      getUnit(id)
        .then(async (data) => {
          if (cancelled) return;
          setUnit(data);
          const courseData = await getCourse(data.courseId);
          if (!cancelled) setCourse(courseData);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load the unit.");
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

  if (!permissionsLoading && !canEdit) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to edit units.
      </p>
    );
  }

  const backHref = unit
    ? `/units?courseId=${unit.courseId}&curriculumId=${unit.curriculumId}`
    : "/units";

  const description = course
    ? `${course.code} ${course.name}${unit ? ` — ${unit.curriculum?.cycleName ?? ""}` : ""}`.trim()
    : "Update the unit&apos;s details.";

  return (
    <>
      <PageToolbar
        title="Edit Unit"
        description={description}
        primaryActions={[
          { label: "Back to Units", icon: ArrowLeft, href: backHref, variant: "outline" },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing unit id.
            </p>
          ) : loading ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : unit && course ? (
            <UnitForm
              key={unit.id}
              unit={unit}
              course={course}
              initialCurriculumId={unit.curriculumId}
              onSuccess={() => router.push(backHref)}
              onCancel={() => router.push(backHref)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
