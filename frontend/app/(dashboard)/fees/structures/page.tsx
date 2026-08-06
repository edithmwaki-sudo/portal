"use client"

import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { FeeStatusBadge } from "@/components/dashboard/fees/fee-status-badge";
import { DeleteFeeStructureDialog } from "@/components/dashboard/fees/delete-fee-structure-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  getFeeStructures,
  type FeeStructure,
} from "@/lib/api/fees";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

type StatusFilter = "all" | "active" | "inactive";

export default function FeeStructuresPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canManage = hasAnyPermission(permissions, ["fee_structure.manage"]);

  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [refresh, setRefresh] = useState(0);
  const [structureToDelete, setStructureToDelete] = useState<FeeStructure | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (permissionsLoading) return;
      setLoading(true);
      setError(null);

      getFeeStructures(
        1,
        100,
        query.trim() || undefined,
        status === "all" ? undefined : status
      )
        .then((data) => {
          if (!cancelled) setStructures(data.items);
        })
        .catch(() => {
          if (!cancelled)
            setError("Failed to load fee structures. Please try again.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, status, refresh, permissionsLoading]);

  return (
    <>
      <PageToolbar
        title="Fee Structures"
        description="Define reusable fee structures with their line items."
        primaryActions={[
          {
            label: "Add Fee Structure",
            icon: Plus,
            href: "/fees/structures/create",
          },
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-white shadow-lg shadow-black/5">
          <form
            className="flex items-center gap-2 border-b px-4 pb-4 pt-4"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or description..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as StatusFilter)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Fee Name</TableHead>
                <TableHead className="px-4">Description</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4 text-center">Items</TableHead>
                <TableHead className="px-4">Start Date</TableHead>
                <TableHead className="px-4">End Date</TableHead>
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
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-64" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="mx-auto h-4 w-8" />
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
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : structures.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim() || status !== "all"
                      ? 'No fee structures match your filters.'
                      : 'No fee structures yet. Click "Add Fee Structure" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                structures.map((structure, index) => (
                  <TableRow key={structure.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4 font-medium">
                      {structure.feeName}
                    </TableCell>
                    <TableCell className="max-w-xs px-4 truncate text-muted-foreground">
                      {structure.description ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      <FeeStatusBadge status={structure.status} />
                    </TableCell>
                    <TableCell className="px-4 text-center">
                      {structure.itemsCount}
                    </TableCell>
                    <TableCell className="px-4">
                      {structure.startDate?.slice(0, 10)}
                    </TableCell>
                    <TableCell className="px-4">
                      {structure.endDate?.slice(0, 10) ?? "—"}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Edit ${structure.feeName}`}
                          asChild
                        >
                          <Link
                            href={`/fees/structures/edit?id=${structure.id}`}
                          >
                            <Pencil />
                          </Link>
                        </Button>
                        {canManage && (
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            aria-label={`Delete ${structure.feeName}`}
                            onClick={() => setStructureToDelete(structure)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DeleteFeeStructureDialog
        structure={structureToDelete}
        open={!!structureToDelete}
        onOpenChange={(open) => {
          if (!open) setStructureToDelete(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}
