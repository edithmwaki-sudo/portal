"use client"

import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StatusBadge } from "@/components/dashboard/certifications/status-badge";
import { DeleteLevelDialog } from "@/components/dashboard/certifications/delete-level-dialog";
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
  getCertificationLevels,
  getCertificationAuthority,
  type CertificationLevel,
} from "@/lib/api/certifications";

export default function CertificationLevelsPage() {
  const searchParams = useSearchParams();
  const authorityIdParam = searchParams.get("authorityId");
  const authorityId = authorityIdParam ? Number(authorityIdParam) : undefined;

  const [levels, setLevels] = useState<CertificationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorityName, setAuthorityName] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [deleteLevel, setDeleteLevel] = useState<CertificationLevel | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      const tasks: Promise<void>[] = [
        getCertificationLevels(1, 100, query.trim() || undefined, authorityId)
          .then((data) => {
            if (!cancelled) setLevels(data.items);
          })
          .catch(() => {
            if (!cancelled)
              setError(
                "Failed to load certification levels. Please try again."
              );
          }),
      ];

      if (authorityId) {
        tasks.push(
          getCertificationAuthority(authorityId)
            .then((authority) => {
              if (!cancelled) setAuthorityName(authority.name);
            })
            .catch(() => {
              if (!cancelled) setAuthorityName(undefined);
            })
        );
      }

      Promise.all(tasks).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, refresh, authorityId]);

  return (
    <>
      <PageToolbar
        title="Certification Levels"
        description={
          authorityName
            ? `Certification levels under ${authorityName}.`
            : "Manage certification levels across authorities."
        }
        primaryActions={[
          {
            label: "Add Level",
            icon: Plus,
            href: `/certification/levels/create${authorityId ? `?authorityId=${authorityId}` : ""}`,
          },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <Link
          href="/certification/authorities"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to authorities
        </Link>
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
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
                {!authorityId && (
                  <TableHead className="px-4">Authority</TableHead>
                )}
                <TableHead className="px-4">Code</TableHead>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Entry Grade</TableHead>
                <TableHead className="px-4">Status</TableHead>
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
                    {!authorityId && (
                      <TableCell className="px-4">
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                    )}
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-14" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="ml-auto h-8 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={authorityId ? 6 : 7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : levels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={authorityId ? 6 : 7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No levels match "${query.trim()}".`
                      : 'No levels yet. Click "Add Level" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                levels.map((level, index) => (
                  <TableRow key={level.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    {!authorityId && (
                      <TableCell className="px-4">
                        {level.certificationAuthorityName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="px-4 font-mono text-xs">
                      {level.code}
                    </TableCell>
                    <TableCell className="px-4 font-medium">
                      {level.name}
                    </TableCell>
                    <TableCell className="px-4">
                      {level.entryGrade ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <StatusBadge active={level.isActive} />
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Edit ${level.name}`}
                          asChild
                        >
                          <Link href={`/certification/levels/edit?id=${level.id}`}>
                            <Pencil />
                          </Link>
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="destructive"
                          aria-label={`Delete ${level.name}`}
                          onClick={() => setDeleteLevel(level)}
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
      <DeleteLevelDialog
        level={deleteLevel}
        open={!!deleteLevel}
        onOpenChange={(open) => {
          if (!open) setDeleteLevel(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}