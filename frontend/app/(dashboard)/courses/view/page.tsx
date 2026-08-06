"use client"

import { useEffect, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { StatusBadge } from "@/components/dashboard/certifications/status-badge";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { UnitTable } from "@/components/dashboard/units/unit-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCourse, type Course } from "@/lib/api/courses";
import { getUnits, type Unit } from "@/lib/api/units";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function ViewCoursePage() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;

  const { permissions, loading: permissionsLoading } = usePermissions();
  const canEdit = hasAnyPermission(permissions, ["course.edit"]);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getCourse(id)
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
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setUnitsLoading(true);
      setUnitsError(null);
      getUnits({ page: 1, limit: 100, courseId: id })
        .then((data) => {
          if (!cancelled) setUnits(data.items);
        })
        .catch(() => {
          if (!cancelled) setUnitsError("Failed to load units.");
        })
        .finally(() => {
          if (!cancelled) setUnitsLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (
    !permissionsLoading &&
    !hasAnyPermission(permissions, ["course.view", "course.hodview"])
  ) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view course details.
      </p>
    );
  }

  return (
    <>
      <PageToolbar
        title="Course Details"
        description={
          course ? `${course.code} ${course.name}`.trim() : "Course details."
        }
        primaryActions={[
          {
            label: "Back to Courses",
            icon: ArrowLeft,
            href: "/courses",
            variant: "outline",
          },
          ...(canEdit && course
            ? [
                {
                  label: "Edit Course",
                  icon: Pencil,
                  href: `/courses/edit?id=${course.id}`,
                },
              ]
            : []),
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-white p-6 shadow-lg shadow-black/5">
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing course id.
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
          ) : course ? (
            <>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                <DetailItem label="Course Code" value={course.code} />
                <DetailItem label="Initials" value={course.initials} />
                <DetailItem label="Course Name" value={course.name} />
                <DetailItem
                  label="Certification Authority"
                  value={course.certificationAuthorityName}
                />
                <DetailItem
                  label="Certification Level"
                  value={course.certificationLevelName}
                />
                <DetailItem label="Department" value={course.departmentName} />
                <DetailItem label="Status">
                  <StatusBadge active={course.isActive} />
                </DetailItem>
                <DetailItem
                  label="Created At"
                  value={new Date(course.createdAt).toLocaleDateString()}
                />
                <DetailItem
                  label="Last Updated"
                  value={new Date(course.updatedAt).toLocaleDateString()}
                />
                <div className="sm:col-span-2 xl:col-span-3">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Description
                  </dt>
                  <dd className="mt-1 text-sm">
                    {course.description ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2 xl:col-span-3">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Linked Curricula
                  </dt>
                  <dd className="mt-1">
                    {course.curricula.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {course.curricula.map((item) => (
                          <li
                            key={item.courseCurriculumId}
                            className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
                          >
                            <span className="font-medium">
                              {item.cycleName}
                            </span>
                            <StatusBadge active={item.isActive} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 border-t pt-6">
                <h2 className="text-base font-semibold">Units</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Units assigned to this course (read-only).
                </p>
                <UnitTable
                  units={units}
                  loading={unitsLoading}
                  error={unitsError}
                  query=""
                  canEdit={false}
                  emptyMessage="No units assigned to this course yet."
                  onDelete={() => undefined}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

function DetailItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">
        {children ?? (value ? value : <span className="text-muted-foreground">—</span>)}
      </dd>
    </div>
  );
}
