"use client"

import { useEffect, useState } from "react";
import { Pencil, Undo2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudent, type StudentResponse } from "@/lib/api/students";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function DetailRows({ rows }: { rows: [string, string | number | null | undefined][] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b last:border-b-0">
              <td className="w-56 bg-muted/40 px-4 py-2 font-medium">
                {label}
              </td>
              <td className="px-4 py-2">
                {value === null || value === undefined || value === ""
                  ? "—"
                  : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ViewStudentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id) || undefined;

  const [student, setStudent] = useState<StudentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    getStudent(id)
      .then((data) => {
        if (!cancelled) setStudent(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the student record.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const enrolment = student?.activeEnrolment;

  return (
    <>
      <PageToolbar
        title="View Student"
        description="Full record for the selected student."
        primaryActions={[
          {
            label: "Edit Student",
            icon: Pencil,
            href: id ? `/student/edit?id=${id}` : undefined,
          },
        ]}
      />
      <div className="mx-[50px] mb-[30px]">
        {!id ? (
          <div className="rounded-lg bg-white p-6 text-center text-sm text-muted-foreground shadow-lg shadow-black/5">
            Missing student id.
          </div>
        ) : loading ? (
          <div className="grid gap-4 rounded-lg bg-white p-6 shadow-lg shadow-black/5">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-white p-6 text-center text-sm text-muted-foreground shadow-lg shadow-black/5">
            {error}
          </div>
        ) : student ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-6 py-4 shadow-lg shadow-black/5">
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {student.user.name}
                </h1>
                <p className="truncate text-sm text-muted-foreground">
                  {student.admissionNumber ?? "—"} ·{" "}
                  {enrolment?.courseName ?? "No course"}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/student/search")}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Back to Search
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg bg-white p-6 shadow-lg shadow-black/5">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Personal &amp; Contact
                </h2>
                <DetailRows
                  rows={[
                    ["Full Name", student.user.name],
                    ["Gender", student.user.gender],
                    ["Date of Birth", formatDate(student.user.dateOfBirth)],
                    ["Nationality", student.user.nationality],
                    ["Place of Birth", student.user.placeOfBirth],
                    ["Religion", student.user.religion],
                    ["National ID", student.nationalId],
                    ["Phone", student.user.phone],
                    ["Alternative Phone", student.user.alternativePhoneNumber],
                    ["Email", student.user.email],
                    ["Address", student.user.address],
                    ["City", student.user.city],
                    ["County", student.user.county],
                    ["Postal Code", student.user.postalCode],
                    [
                      "Disability (PWD)",
                      student.user.isPwd
                        ? [student.user.disabilityType, student.user.disabilityDescription]
                            .filter(Boolean)
                            .join(" — ")
                        : "No",
                    ],
                  ]}
                />
              </section>

              <section className="space-y-4">
                <div className="rounded-lg bg-white p-6 shadow-lg shadow-black/5">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">
                    Admission
                  </h2>
                  <DetailRows
                    rows={[
                      ["Admission Number", student.admissionNumber],
                      ["Course", enrolment?.courseName],
                      ["Course Code", enrolment?.courseCode],
                      ["Curriculum", enrolment?.curriculumName],
                      ["Department", enrolment?.departmentName],
                      ["Level", student.level],
                      ["Admission Date", formatDate(student.admDate)],
                      ["Status", student.status],
                      ["Academic Year", enrolment?.academicYearName],
                      ["Academic Session", enrolment?.academicSessionName],
                    ]}
                  />
                </div>

                <div className="rounded-lg bg-white p-6 shadow-lg shadow-black/5">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">
                    Next of Kin
                  </h2>
                  <DetailRows
                    rows={[
                      [
                        "Name",
                        [student.nextOfKinFirstName, student.nextOfKinLastName]
                          .filter(Boolean)
                          .join(" "),
                      ],
                      ["Relationship", student.nextOfKinRelationship],
                      ["Phone", student.nextOfKinPhone],
                      ["Alternative Phone", student.nextOfKinAltPhone],
                      ["Email", student.nextOfKinEmail],
                    ]}
                  />
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}