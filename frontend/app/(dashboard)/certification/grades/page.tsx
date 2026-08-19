"use client"

import { useEffect, useState } from "react";
import { ArrowLeft, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StatusBadge } from "@/components/dashboard/certifications/status-badge";
import { DeleteGradeDialog } from "@/components/dashboard/certifications/delete-grade-dialog";
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
import {
  getCertificationGrades,
  getCertificationAuthority,
  type CertificationGrade,
} from "@/lib/api/certifications";

export default function CertificationGradesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const authorityIdParam = searchParams.get("authorityId");
  const authorityId = authorityIdParam ? Number(authorityIdParam) : undefined;

  const [authorityName, setAuthorityName] = useState<string | undefined>();
  const [grades, setGrades] = useState<CertificationGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [deleteGrade, setDeleteGrade] = useState<CertificationGrade | null>(
    null
  );

  useEffect(() => {
    if (!authorityId) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      Promise.all([
        getCertificationAuthority(authorityId).then((authority) => {
          if (!cancelled) setAuthorityName(authority.name);
        }),
        getCertificationGrades(
          authorityId,
          1,
          100,
          query.trim() || undefined
        )
          .then((data) => {
            if (!cancelled) setGrades(data.items);
          })
          .catch(() => {
            if (!cancelled) setError("Failed to load grades. Please try again.");
          }),
      ]).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authorityId, query, refresh]);

  return (
    <>
      <PageToolbar
        title="Certification Grades"
        description={
          authorityName
            ? `Grade ranges for ${authorityName}.`
            : "Manage grade ranges for a certification authority."
        }
        primaryActions={[
          {
            label: "Add Grade",
            icon: Plus,
            href: authorityId
              ? `/certification/grades/create?authorityId=${authorityId}`
              : "/certification/authorities",
          },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <Link
          href="/certification/authorities"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          onClick={(event) => {
            event.preventDefault();
            router.back();
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
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
              placeholder="Search by grade or remark..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-sm"
            />
          </form>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-4">S/NO</TableHead>
                <TableHead className="px-4">Grade</TableHead>
                <TableHead className="px-4">Range</TableHead>
                <TableHead className="px-4">Remark</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="w-12 px-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!authorityId ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Missing certification authority. Select an authority first.
                  </TableCell>
                </TableRow>
              ) : loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-36" />
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
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : grades.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {query.trim()
                      ? `No grades match "${query.trim()}".`
                      : 'No grades yet. Click "Add Grade" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                grades.map((grade, index) => (
                  <TableRow key={grade.id}>
                    <TableCell className="px-4">{index + 1}</TableCell>
                    <TableCell className="px-4 font-medium">
                      {grade.grade}
                    </TableCell>
                    <TableCell className="px-4 font-mono text-xs">
                      {grade.gradeStart} – {grade.gradeEnd}
                    </TableCell>
                    <TableCell className="px-4">
                      {grade.remark ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <StatusBadge active={grade.isActive} />
                    </TableCell>
                    <TableCell className="px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for grade ${grade.grade}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/certification/grades/edit?id=${grade.id}&authorityId=${grade.certificationAuthorityId}`}
                            >
                              <Pencil />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteGrade(grade)}
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
      {authorityId && (
        <DeleteGradeDialog
          certificationAuthorityId={authorityId}
          grade={deleteGrade}
          open={!!deleteGrade}
          onOpenChange={(open) => {
            if (!open) setDeleteGrade(null);
          }}
          onDeleted={() => setRefresh((value) => value + 1)}
        />
      )}
    </>
  );
}