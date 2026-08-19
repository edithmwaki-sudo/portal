"use client"

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StatusBadge } from "@/components/dashboard/certifications/status-badge";
import { DeleteCurriculumDialog } from "@/components/dashboard/certifications/delete-curriculum-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getCurricula, type Curriculum } from "@/lib/api/curriculums";
import { getCertificationAuthority } from "@/lib/api/certifications";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toISOString().slice(0, 10);
}

export default function CurriculumPage() {
  const searchParams = useSearchParams();
  const authorityIdParam = searchParams.get("authorityId");
  const authorityId = authorityIdParam ? Number(authorityIdParam) : undefined;

  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorityName, setAuthorityName] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [curriculumToDelete, setCurriculumToDelete] = useState<Curriculum | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      const tasks: Promise<void>[] = [
        getCurricula(1, 100, query.trim() || undefined, authorityId)
          .then((data) => {
            if (!cancelled) setCurricula(data.items);
          })
          .catch(() => {
            if (!cancelled)
              setError("Failed to load curricula. Please try again.");
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
        title="Curricula"
        description={
          authorityName
            ? `Curricula under ${authorityName}.`
            : "Manage curriculum cycles tied to certification authorities."
        }
        primaryActions={[
          {
            label: "Add Curriculum",
            icon: Plus,
            href: `/curriculum/create${authorityId ? `?authorityId=${authorityId}` : ""}`,
          },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <Link
          href="/certification/authorities"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to certification authorities
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
              placeholder="Search by cycle name or certification authority..."
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
                  <TableHead className="px-4">Certification Authority</TableHead>
                )}
                <TableHead className="px-4">Cycle Name</TableHead>
                <TableHead className="px-4">Start Date</TableHead>
                <TableHead className="px-4">End Date</TableHead>
                <TableHead className="px-4">Status</TableHead>
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
                    {!authorityId && (
                      <TableCell className="px-4">
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                    )}
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-14" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={authorityId ? 7 : 8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : curricula.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={authorityId ? 7 : 8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No curricula match "${query.trim()}".`
                      : 'No curricula yet. Click "Add Curriculum" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                curricula.map((curriculum, index) => (
                  <TableRow key={curriculum.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    {!authorityId && (
                      <TableCell className="px-4">
                        {curriculum.certificationAuthorityName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="px-4 font-medium">
                      {curriculum.cycleName}
                    </TableCell>
                    <TableCell className="px-4 text-sm">
                      {formatDate(curriculum.startedAt)}
                    </TableCell>
                    <TableCell className="px-4 text-sm">
                      {formatDate(curriculum.endedAt)}
                    </TableCell>
                    <TableCell className="px-4">
                      <StatusBadge active={curriculum.isActive} />
                    </TableCell>
                    <TableCell className="px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${curriculum.cycleName}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/curriculum/edit?id=${curriculum.id}`}>
                              <Pencil />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setCurriculumToDelete(curriculum)}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DeleteCurriculumDialog
        curriculum={curriculumToDelete}
        open={!!curriculumToDelete}
        onOpenChange={(open) => {
          if (!open) setCurriculumToDelete(null);
        }}
        onDeleted={() => setRefresh((value) => value + 1)}
      />
    </>
  );
}
