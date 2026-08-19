"use client"

import { Eye, Layers, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
          <TableHead className="w-12 px-4">Action</TableHead>
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
                <Skeleton className="h-8 w-8" />
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${course.name}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/courses/view?id=${course.id}`}>
                        <Eye />
                        View Course
                      </Link>
                    </DropdownMenuItem>
                    {canEdit && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href={`/courses/edit?id=${course.id}`}>
                            <Pencil />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(course)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
