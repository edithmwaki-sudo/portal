"use client"

import { useCallback, useEffect, useState } from "react";
import { Plus, RotateCcw, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { CourseTable } from "@/components/dashboard/courses/course-table";
import { DeleteCourseDialog } from "@/components/dashboard/courses/delete-course-dialog";
import { AsyncSearchSelect, type AsyncSearchOption } from "@/components/ui/async-search-select";
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
  getCourses,
  getMyCourseDepartment,
  getCourseAuthorityOptions,
  getAllCourseLevelOptions,
  getAllCourseCurriculumOptions,
  type Course,
} from "@/lib/api/courses";
import {
  usePermissions,
  hasAnyPermission,
} from "@/hooks/use-current-user";

type StatusFilter = "all" | "active" | "inactive";

interface CourseFilters {
  certificationAuthorityId?: string;
  certificationLevelId?: string;
  curriculumId?: string;
  status: StatusFilter;
  search: string;
}

const EMPTY_FILTERS: CourseFilters = {
  certificationAuthorityId: "",
  certificationLevelId: "",
  curriculumId: "",
  status: "all",
  search: "",
};

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deptidParam = searchParams.get("deptid");

  const { permissions, loading: permissionsLoading } = usePermissions();
  const isAdmin = hasAnyPermission(permissions, ["course.view"]);
  const canAdd = hasAnyPermission(permissions, ["course.add"]);
  const canEdit = hasAnyPermission(permissions, ["course.edit"]);
  const canAssignUnits = hasAnyPermission(permissions, [
    "unit.add",
    "unit.hodview",
  ]);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CourseFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<CourseFilters>(EMPTY_FILTERS);
  const [refresh, setRefresh] = useState(0);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [department, setDepartment] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const authorityId = Number(draft.certificationAuthorityId) || 0;

  const [levelOptions, setLevelOptions] = useState<AsyncSearchOption[]>([]);
  const [curriculumOptions, setCurriculumOptions] = useState<
    AsyncSearchOption[]
  >([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [loadingCurricula, setLoadingCurricula] = useState(false);

  useEffect(() => {
    if (!authorityId) {
      setLevelOptions([]);
      setCurriculumOptions([]);
      setLoadingLevels(false);
      setLoadingCurricula(false);
      return;
    }
    let cancelled = false;
    setLoadingLevels(true);
    setLoadingCurricula(true);
    Promise.all([
      getAllCourseLevelOptions(authorityId).catch(() => []),
      getAllCourseCurriculumOptions(authorityId).catch(() => []),
    ])
      .then(([levels, curricula]) => {
        if (cancelled) return;
        setLevelOptions(levels);
        setCurriculumOptions(curricula);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingLevels(false);
          setLoadingCurricula(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authorityId]);

  useEffect(() => {
    if (permissionsLoading || isAdmin) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      getMyCourseDepartment()
        .then((dept) => {
          if (!cancelled) setDepartment(dept);
        })
        .catch(() => {
          if (!cancelled) setDepartment(null);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [permissionsLoading, isAdmin]);

  useEffect(() => {
    if (permissionsLoading) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getCourses({
        page: 1,
        limit: 100,
        search: applied.search.trim() || undefined,
        status: applied.status === "all" ? undefined : applied.status,
        certificationAuthorityId: applied.certificationAuthorityId
          ? Number(applied.certificationAuthorityId)
          : undefined,
        certificationLevelId: applied.certificationLevelId
          ? Number(applied.certificationLevelId)
          : undefined,
        curriculumId: applied.curriculumId
          ? Number(applied.curriculumId)
          : undefined,
      })
        .then((data) => {
          if (!cancelled) setCourses(data.items);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load courses. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [applied, refresh, permissionsLoading]);

  useEffect(() => {
    if (permissionsLoading || isAdmin || !department) {
      return;
    }
    if (deptidParam && Number(deptidParam) === department.id) {
      return;
    }
    const timer = setTimeout(() => {
      router.replace(`/courses?deptid=${department.id}`);
    }, 0);
    return () => clearTimeout(timer);
  }, [permissionsLoading, isAdmin, department, deptidParam, router]);

  const fetchAuthorityOptions = useCallback(
    (search: string) => getCourseAuthorityOptions(search),
    []
  );

  function handleAuthorityChange(next?: string) {
    setDraft((current) => ({
      ...current,
      certificationAuthorityId: next ?? "",
      certificationLevelId: "",
      curriculumId: "",
    }));
  }

  function handleApply() {
    setApplied(draft);
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  }

  const hasActiveFilters =
    applied.certificationAuthorityId !== "" ||
    applied.certificationLevelId !== "" ||
    applied.curriculumId !== "" ||
    applied.status !== "all" ||
    applied.search.trim() !== "";

  const title = isAdmin ? "Courses" : "Department Courses";
  const description = isAdmin
    ? "Manage courses and course offerings."
    : department
      ? `Courses in ${department.name}.`
      : "Courses in your department.";

  return (
    <>
      <PageToolbar
        title={title}
        description={description}
        primaryActions={
          canAdd
            ? [{ label: "Add Course", icon: Plus, href: "/courses/create" }]
            : undefined
        }
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <form
            className="border-b px-4 py-4"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by course code, name or initials..."
                value={draft.search}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                className="max-w-sm"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Certification Authority</Label>
                <AsyncSearchSelect
                  value={draft.certificationAuthorityId || undefined}
                  onValueChange={handleAuthorityChange}
                  getOptions={fetchAuthorityOptions}
                  placeholder="All authorities"
                  searchPlaceholder="Search by code or name..."
                  minChars={1}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Certification Level</Label>
                <AsyncSearchSelect
                  value={draft.certificationLevelId || undefined}
                  onValueChange={(next) =>
                    setDraft((current) => ({
                      ...current,
                      certificationLevelId: next ?? "",
                    }))
                  }
                  getOptions={(search) =>
                    Promise.resolve(
                      levelOptions.filter((option) =>
                        option.label
                          .toLowerCase()
                          .includes(search.trim().toLowerCase())
                      )
                    )
                  }
                  preloadedOptions={levelOptions}
                  placeholder={
                    authorityId
                      ? loadingLevels
                        ? "Loading levels..."
                        : "All levels"
                      : "Select an authority first"
                  }
                  searchPlaceholder="Search by name or code..."
                  disabled={!authorityId || loadingLevels}
                  minChars={1}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Curriculum</Label>
                <AsyncSearchSelect
                  value={draft.curriculumId || undefined}
                  onValueChange={(next) =>
                    setDraft((current) => ({
                      ...current,
                      curriculumId: next ?? "",
                    }))
                  }
                  getOptions={(search) =>
                    Promise.resolve(
                      curriculumOptions.filter((option) =>
                        option.label
                          .toLowerCase()
                          .includes(search.trim().toLowerCase())
                      )
                    )
                  }
                  preloadedOptions={curriculumOptions}
                  placeholder={
                    authorityId
                      ? loadingCurricula
                        ? "Loading curricula..."
                        : "All curricula"
                      : "Select an authority first"
                  }
                  searchPlaceholder="Search by cycle name..."
                  disabled={!authorityId || loadingCurricula}
                  minChars={1}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      status: value as StatusFilter,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={!hasActiveFilters && draft === EMPTY_FILTERS}
              >
                <RotateCcw />
                Reset
              </Button>
              <Button type="button" onClick={handleApply}>
                Apply Filters
              </Button>
            </div>
          </form>

          <CourseTable
            courses={courses}
            loading={loading}
            error={error}
            query={applied.search}
            canAssignUnits={canAssignUnits}
            canEdit={canEdit}
            onDelete={setCourseToDelete}
          />
        </div>
      </div>
      <DeleteCourseDialog
        course={courseToDelete}
        open={!!courseToDelete}
        onOpenChange={(open) => {
          if (!open) setCourseToDelete(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}
