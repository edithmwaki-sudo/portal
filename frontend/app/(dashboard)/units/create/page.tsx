"use client"

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { UnitForm } from "@/components/dashboard/units/unit-form";
import { Button } from "@/components/ui/button";
import { getCourse, type Course } from "@/lib/api/courses";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function CreateUnitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = Number(searchParams.get("courseId")) || undefined;
  const curriculumIdParam = Number(searchParams.get("curriculumId")) || undefined;

  const { permissions, loading: permissionsLoading } = usePermissions();
  const canAdd = hasAnyPermission(permissions, ["unit.add"]);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getCourse(courseId)
        .then((data) => {
          if (!cancelled) setCourse(data);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load the course.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [courseId]);

  if (!permissionsLoading && !canAdd) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to add units.
      </p>
    );
  }

  const backHref = courseId ? `/units?courseId=${courseId}` : "/units";

  return (
    <>
      <PageToolbar
        title="Assign Unit"
        description="Create a unit for a course and curriculum."
        primaryActions={[
          { label: "Back to Units", icon: ArrowLeft, href: backHref, variant: "outline" },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          {!courseId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing course id. Open a course to assign units.
            </p>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading course...
            </p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : !course ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Course not found.
            </p>
          ) : course.curricula.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              This course has no linked curriculum. Link a curriculum to the
              course before assigning units.
            </p>
          ) : (
            <UnitForm
              course={course}
              initialCurriculumId={curriculumIdParam || undefined}
              onSuccess={(unit) =>
                router.push(
                  `/units?courseId=${course.id}&curriculumId=${unit.curriculumId}`
                )
              }
              onCancel={() => router.push(backHref)}
            />
          )}
        </div>
      </div>
    </>
  );
}
