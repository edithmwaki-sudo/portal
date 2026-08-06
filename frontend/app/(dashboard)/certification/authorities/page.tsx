"use client"

import { useEffect, useState } from "react";
import {
  BookOpen,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StatusBadge } from "@/components/dashboard/certifications/status-badge";
import { DeleteAuthorityDialog } from "@/components/dashboard/certifications/delete-authority-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCertificationAuthorities,
  type CertificationAuthority,
} from "@/lib/api/certifications";

export default function CertificationAuthoritiesPage() {
  const [authorities, setAuthorities] = useState<CertificationAuthority[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [deleteAuthority, setDeleteAuthority] =
    useState<CertificationAuthority | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      getCertificationAuthorities(1, 100, query.trim() || undefined)
        .then((data) => {
          if (!cancelled) setAuthorities(data.items);
        })
        .catch(() => {
          if (!cancelled)
            setError(
              "Failed to load certification authorities. Please try again."
            );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, refresh]);

  return (
    <>
      <PageToolbar
        title="Certification Authorities"
        description="Manage certification authorities and their levels and grades."
        primaryActions={[
          {
            label: "Add Authority",
            icon: Plus,
            href: "/certification/authorities/create",
          },
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-white shadow-lg shadow-black/5">
          <form
            className="flex items-center gap-2 border-b px-4 py-4"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by code or name..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-sm"
            />
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Code</TableHead>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4">Levels</TableHead>
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
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-14" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="ml-auto h-8 w-28" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : authorities.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No authorities match "${query.trim()}".`
                      : 'No authorities yet. Click "Add Authority" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                authorities.map((authority, index) => (
                  <TableRow key={authority.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4 font-mono text-xs">
                      {authority.code}
                    </TableCell>
                    <TableCell className="px-4 font-medium">
                      {authority.name}
                    </TableCell>
                    <TableCell className="px-4">
                      <StatusBadge active={authority.isActive} />
                    </TableCell>
                    <TableCell className="px-4">
                      {authority.levelsCount}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/certification/levels?authorityId=${authority.id}`}
                        >
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Levels for ${authority.name}`}
                            title="View levels"
                          >
                            <Layers />
                          </Button>
                        </Link>
                        <Link
                          href={`/certification/grades?authorityId=${authority.id}`}
                        >
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Grades for ${authority.name}`}
                            title="View grades"
                          >
                            <BookOpen />
                          </Button>
                        </Link>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Edit ${authority.name}`}
                          asChild
                        >
                          <Link
                            href={`/certification/authorities/edit?id=${authority.id}`}
                          >
                            <Pencil />
                          </Link>
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="destructive"
                          aria-label={`Delete ${authority.name}`}
                          onClick={() => setDeleteAuthority(authority)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DeleteAuthorityDialog
        authority={deleteAuthority}
        open={!!deleteAuthority}
        onOpenChange={(open) => {
          if (!open) setDeleteAuthority(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}