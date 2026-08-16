"use client"

import { useCallback, useEffect, useState } from "react";
import { FileDown, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCourses } from "@/lib/api/courses";
import { getCurricula } from "@/lib/api/curriculums";
import {
  exportStudents,
  getStudents,
  type StudentResponse,
} from "@/lib/api/students";
import { usePermissions } from "@/hooks/use-current-user";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-red-100 text-red-700",
  GRADUATED: "bg-sky-100 text-sky-700",
};

type StatusFilter = "all" | "ACTIVE" | "INACTIVE" | "GRADUATED";
type LevelFilter = "all" | "1" | "2" | "3" | "4" | "5" | "6";

export function StudentsClient() {
  const { loading: permissionsLoading } = usePermissions();

  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [courseId, setCourseId] = useState<string>("");
  const [curriculumId, setCurriculumId] = useState<string>("");

  const [courseOptions, setCourseOptions] = useState<
    { id: number; label: string }[]
  >([]);
  const [curriculumOptions, setCurriculumOptions] = useState<
    { id: number; label: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCourses({ page: 1, limit: 100 }),
      getCurricula(1, 100),
    ])
      .then(([coursesResult, curriculaResult]) => {
        if (cancelled) return;
        setCourseOptions(
          coursesResult.items.map((course) => ({
            id: course.id,
            label: `${course.code} - ${course.name}`,
          }))
        );
        setCurriculumOptions(
          curriculaResult.items.map((curriculum) => ({
            id: curriculum.id,
            label: curriculum.cycleName,
          }))
        );
      })
      .catch(() => {
        // Filter dropdowns are non-critical — the list still loads.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (permissionsLoading) return;
      setLoading(true);
      setError(null);

      getStudents({
        page: 1,
        limit: 100,
        status: status === "all" ? undefined : status,
        level: level === "all" ? undefined : Number(level),
        courseId: courseId ? Number(courseId) : undefined,
        curriculumId: curriculumId ? Number(curriculumId) : undefined,
      })
        .then((data) => {
          if (!cancelled) setStudents(data.items);
        })
        .catch(() => {
          if (!cancelled)
            setError("Failed to load students. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    status,
    level,
    courseId,
    curriculumId,
    permissionsLoading,
  ]);

  const hasActiveFilters =
    status !== "all" ||
    level !== "all" ||
    courseId !== "" ||
    curriculumId !== "";

  const handleExport = useCallback(async () => {
    try {
      await exportStudents({
        status: status === "all" ? undefined : status,
        level: level === "all" ? undefined : Number(level),
        courseId: courseId ? Number(courseId) : undefined,
        curriculumId: curriculumId ? Number(curriculumId) : undefined,
      });
    } catch {
      toast.error("Failed to export students. Please try again.");
    }
  }, [status, level, courseId, curriculumId]);

  return (
    <>
      <PageToolbar
        title="Students"
        description="Admit new students, view admission letters and manage records."
        primaryActions={[
          {
            label: "Export CSV",
            icon: FileDown,
            variant: "outline",
            onClick: handleExport,
          },
          { label: "Add Student", icon: Plus, href: "/student/create" },
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-white shadow-lg shadow-black/5">
          <form
            className="flex flex-wrap items-center gap-2 border-b px-4 pb-4 pt-4"
            onSubmit={(event) => event.preventDefault()}
          >
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as StatusFilter)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="GRADUATED">Graduated</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={level}
              onValueChange={(value) => setLevel(value as LevelFilter)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    Year {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All courses</SelectItem>
                {courseOptions.map((course) => (
                  <SelectItem key={course.id} value={String(course.id)}>
                    {course.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={curriculumId} onValueChange={setCurriculumId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All curricula" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All curricula</SelectItem>
                {curriculumOptions.map((curriculum) => (
                  <SelectItem
                    key={curriculum.id}
                    value={String(curriculum.id)}
                  >
                    {curriculum.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Admission No.</TableHead>
                <TableHead className="px-4">Course</TableHead>
                <TableHead className="px-4">Curriculum</TableHead>
                <TableHead className="px-4">Level</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4">Admission Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {hasActiveFilters
                      ? "No students match your filters."
                      : 'No students yet. Click "Add Student" to admit one.'}
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4">
                      <span className="font-medium">{student.user.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {student.user.email}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 font-mono">
                      {student.admissionNumber ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      {student.activeEnrolment?.courseName ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      {student.activeEnrolment?.curriculumName ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      {student.level ? `Year ${student.level}` : "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[student.status ?? ""] ??
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {student.status ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      {student.admDate?.slice(0, 10) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
