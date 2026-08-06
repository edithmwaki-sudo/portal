"use client"

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/dashboard/certifications/status-badge";
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
import type { Unit } from "@/lib/api/units";

interface UnitTableProps {
  units: Unit[];
  loading: boolean;
  error: string | null;
  query: string;
  canEdit: boolean;
  emptyMessage?: string;
  onDelete: (unit: Unit) => void;
}

export function UnitTable({
  units,
  loading,
  error,
  query,
  canEdit,
  emptyMessage,
  onDelete,
}: UnitTableProps) {
  const columnCount = 7 + (canEdit ? 1 : 0);

  return (
    <Table className="mt-3">
      <TableHeader>
        <TableRow>
          <TableHead className="w-16 px-4">S/NO</TableHead>
          <TableHead className="px-4">Code</TableHead>
          <TableHead className="px-4">Unit Name</TableHead>
          <TableHead className="px-4">Module</TableHead>
          <TableHead className="px-4">Hours</TableHead>
          <TableHead className="px-4">Credit</TableHead>
          <TableHead className="px-4">Status</TableHead>
          {canEdit && (
            <TableHead className="px-4 text-right">Action</TableHead>
          )}
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
                <Skeleton className="h-4 w-10" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-10" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-10" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-14" />
              </TableCell>
              {canEdit && (
                <TableCell className="px-4">
                  <Skeleton className="ml-auto h-8 w-24" />
                </TableCell>
              )}
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
        ) : units.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columnCount}
              className="px-4 py-8 text-center text-sm text-muted-foreground"
            >
              {query.trim()
                ? `No units match "${query.trim()}".`
                : (emptyMessage ?? 'No units yet. Click "Add Unit" to create one.')}
            </TableCell>
          </TableRow>
        ) : (
          units.map((unit, index) => (
            <TableRow key={unit.id}>
              <TableCell className="px-4">{index + 1}</TableCell>
              <TableCell className="px-4 font-medium">{unit.code}</TableCell>
              <TableCell className="px-4">{unit.name}</TableCell>
              <TableCell className="px-4 text-sm">
                {unit.modulesTaught ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-4 text-sm">
                {unit.taughtHours ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-4 text-sm">
                {unit.creditFactor ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-4">
                <StatusBadge active={unit.isActive} />
              </TableCell>
              {canEdit && (
                <TableCell className="px-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label={`Edit ${unit.name}`}
                      asChild
                    >
                      <Link href={`/units/edit?id=${unit.id}`}>
                        <Pencil />
                      </Link>
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      aria-label={`Delete ${unit.name}`}
                      onClick={() => onDelete(unit)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
