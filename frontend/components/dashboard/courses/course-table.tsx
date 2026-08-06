"use client"

import { Eye, Layers, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Course } from "@/lib/api/courses";

interface CourseTableProps {
  courses: Course[];
  loading: boolean;
  error: string | null;
  query: string;
  /** Gate the "View Units" link (navigation into the course's units). */
  canAssignUnits: boolean;
  canEdit: boolean;
  onDelete: (course: Course) => void;
}

export function CourseTable({
  courses,
  loading,
  error,
  query,
  canAssignUnits,
  canEdit,
  onDelete,
}: CourseTableProps) {
  const columnCount = 7;

  return (
    <Table className="mt-3">
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 px-4">S/NO</TableHead>
          <TableHead className="px-4">Code</TableHead>
          <TableHead className="px-4">Course Name</TableHead>
          <TableHead className="px-4">Certification Authority</TableHead>
          <TableHead className="px-4">Certification Level</TableHead>
          <TableHead className="px-4">Course Units</TableHead>
          <TableHead className="px-4 text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-44" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="ml-auto h-8 w-24" />
              </TableCell>
            </TableRow>
          ))
        ) : error ? (
          <TableRow>
            <TableCell
              colSpan={columnCount}
              className="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              {error}
            </TableCell>
          </TableRow>
        ) : courses.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columnCount}
              className="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              {query.trim()
                ? `No courses match "${query.trim()}".`
                : 'No courses yet. Click "Add Course" to create one.'}
            </TableCell>
          </TableRow>
        ) : (
          courses.map((course, index) => (
            <TableRow key={course.id}>
              <TableCell className="px-4">{index + 1}</TableCell>
              <TableCell className="px-4 font-medium">{course.code}</TableCell>
              <TableCell className="px-4">{course.name}</TableCell>
              <TableCell className="px-4 text-sm">
                {course.certificationAuthorityName ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-4 text-sm">
                {course.certificationLevelName ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-4">
                {canAssignUnits ? (
                  <Link
                    href={`/units?courseId=${course.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Layers className="h-4 w-4" />
                    View Units
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-4">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={`View ${course.name} details`}
                    asChild
                  >
                    <Link href={`/courses/view?id=${course.id}`}>
                      <Eye />
                    </Link>
                  </Button>
                  {canEdit && (
                    <>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Edit ${course.name}`}
                        asChild
                      >
                        <Link href={`/courses/edit?id=${course.id}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        aria-label={`Delete ${course.name}`}
                        onClick={() => onDelete(course)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
