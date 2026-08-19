"use client"

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { UnitTable } from "@/components/dashboard/units/unit-table";
import { DeleteUnitDialog } from "@/components/dashboard/units/delete-unit-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCourse,
  type Course,
  type CourseCurriculumItem,
} from "@/lib/api/courses";
import { getUnits, type Unit } from "@/lib/api/units";
import {
  usePermissions,
  hasAnyPermission,
} from "@/hooks/use-current-user";

export default function UnitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = Number(searchParams.get("courseId")) || undefined;
  const curriculumIdParam = Number(searchParams.get("curriculumId")) || undefined;

  const { permissions, loading: permissionsLoading } = usePermissions();
  const canView = hasAnyPermission(permissions, ["unit.view", "unit.hodview"]);
  const canAdd = hasAnyPermission(permissions, ["unit.add"]);
  const canEdit = hasAnyPermission(permissions, ["unit.edit"]);

  const [course, setCourse] = useState<Course | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  const [curriculumId, setCurriculumId] = useState<number | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  useEffect(() => {
    if (permissionsLoading || !canView || !courseId) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setCourseLoading(true);
      setCourseError(null);
      getCourse(courseId)
        .then((data) => {
          if (cancelled) return;
          setCourse(data);
          const curricula = data.curricula;
          const fromParam =
            curriculumIdParam &&
            curricula.some((item) => item.id === curriculumIdParam)
              ? curriculumIdParam
              : undefined;
          const resolved =
            fromParam ??
            curricula.find((item) => item.isActive)?.id ??
            curricula[0]?.id;
          setCurriculumId(resolved ?? null);
          if (resolved && resolved !== curriculumIdParam) {
            router.replace(`/units?courseId=${data.id}&curriculumId=${resolved}`);
          }
        })
        .catch(() => {
          if (!cancelled) setCourseError("Failed to load the course.");
        })
        .finally(() => {
          if (!cancelled) setCourseLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [permissionsLoading, canView, courseId, curriculumIdParam, router]);

  useEffect(() => {
    if (permissionsLoading || !canView || !courseId || !curriculumId) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getUnits({
        page: 1,
        limit: 100,
        courseId,
        curriculumId,
        search: query.trim() || undefined,
      })
        .then((data) => {
          if (!cancelled) setUnits(data.items);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load units. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [permissionsLoading, canView, courseId, curriculumId, query, refresh]);

  const applySearch = useCallback(() => {
    setQuery(search);
  }, [search]);

  function handleCurriculumChange(next: string) {
    const id = Number(next);
    if (id && course) {
      router.push(`/units?courseId=${course.id}&curriculumId=${id}`);
    }
  }

  if (!permissionsLoading && !canView) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view units.
      </p>
    );
  }

  const title = "Units";
  const description = course
    ? `${course.code} ${course.name}`.trim()
    : "Assign units to a course and curriculum.";

  return (
    <>
      <PageToolbar
        title={title}
        description={description}
        primaryActions={
          canAdd && course && curriculumId
            ? [
                {
                  label: "Add Unit",
                  icon: Plus,
                  href: `/units/create?courseId=${course.id}&curriculumId=${curriculumId}`,
                },
              ]
            : undefined
        }
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          {!courseId ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No course selected. Open a course from the course list to
                manage its units.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/courses">
                  <ArrowLeft />
                  Back to Courses
                </Link>
              </Button>
            </div>
          ) : courseLoading ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              Loading course...
            </p>
          ) : courseError ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {courseError}
            </p>
          ) : !course ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              Course not found.
            </p>
          ) : course.curricula.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                This course has no linked curriculum. Link a curriculum to the
                course before assigning units.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href={`/courses/edit?id=${course.id}`}>
                  <ArrowLeft />
                  Edit Course
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="border-b px-4 py-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="w-full max-w-sm space-y-1.5">
                    <Label>Curriculum Version</Label>
                    <Select
                      value={curriculumId ? String(curriculumId) : ""}
                      onValueChange={handleCurriculumChange}
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue placeholder="Select a curriculum" />
                      </SelectTrigger>
                      <SelectContent>
                        {course.curricula.map((item: CourseCurriculumItem) => (
                          <SelectItem
                            key={item.courseCurriculumId}
                            value={String(item.id)}
                          >
                            {item.cycleName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search units..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applySearch();
                        }
                      }}
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={applySearch}
                    >
                      Search
                    </Button>
                  </div>
                </div>
              </div>

              <UnitTable
                units={units}
                loading={loading}
                error={error}
                query={query}
                canEdit={canEdit}
                onDelete={setUnitToDelete}
              />
            </>
          )}
        </div>
      </div>
      <DeleteUnitDialog
        unit={unitToDelete}
        open={!!unitToDelete}
        onOpenChange={(open) => {
          if (!open) setUnitToDelete(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}
