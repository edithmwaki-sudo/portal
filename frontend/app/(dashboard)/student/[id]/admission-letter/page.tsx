"use client"

import { useEffect, useState } from "react";
import { Printer, Undo2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdmissionLetter, type AdmissionLetter } from "@/lib/api/students";

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

export default function AdmissionLetterPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id) || undefined;

  const [letter, setLetter] = useState<AdmissionLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    getAdmissionLetter(id)
      .then((data) => {
        if (!cancelled) setLetter(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the admission letter.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .admission-letter-print, .admission-letter-print * { visibility: visible; }
          .admission-letter-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="mx-[50px] my-[30px] flex items-center justify-between rounded-lg bg-card px-6 py-4 shadow-lg shadow-black/5 print:hidden">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            Admission Letter
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            Printable copy of the student&apos;s admission letter.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/student")}>
            <Undo2 className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="mx-[50px] mb-[30px]">
        {!id ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Missing student id.
          </p>
        ) : loading ? (
          <div className="grid gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {error}
          </p>
        ) : letter ? (
          <div className="admission-letter-print mx-auto max-w-4xl rounded-lg bg-white p-10 shadow-lg shadow-black/5 print:max-w-none print:rounded-none print:p-8 print:shadow-none">
            <div className="border-b-2 border-slate-800 pb-6 text-center">
              <h1 className="text-3xl font-bold uppercase tracking-wide">
                {letter.institutionName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Admissions Office
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Reference No.
                </p>
                <p className="font-mono text-sm font-semibold">
                  {letter.referenceNumber ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Date
                </p>
                <p className="text-sm font-medium">{letter.date}</p>
              </div>
            </div>

            <h2 className="mt-6 text-center text-xl font-semibold uppercase tracking-wide">
              Admission Letter
            </h2>

            <p className="mt-6 text-sm leading-relaxed">
              Dear{" "}
              <span className="font-semibold">{letter.studentName}</span>,
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              Congratulations! We are pleased to inform you that you have been
              offered admission to{" "}
              <span className="font-semibold">{letter.institutionName}</span>{" "}
              for the course of study detailed below. The admission takes effect
              on the admission date shown.
            </p>

            <div className="mt-6 overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Admission Number", letter.admissionNumber],
                    ["Student Name", letter.studentName],
                    ["National ID", letter.nationalId],
                    ["Date of Birth", formatDate(letter.dateOfBirth)],
                    ["Gender", letter.gender ?? "—"],
                    ["Nationality", letter.nationality],
                    ["Place of Birth", letter.placeOfBirth],
                    ["Religion", letter.religion],
                    ["Phone", letter.phone],
                    ["Email", letter.email],
                    ["Postal Address", letter.address],
                    ["City / County", [letter.city, letter.county].filter(Boolean).join(", ") || "—"],
                    ["Course of Study", letter.courseName],
                    ["Course Code", letter.courseCode],
                    ["Curriculum", letter.curriculumName],
                    ["Certification Authority", letter.certificationAuthorityName],
                    ["Certification Level", letter.certificationLevelName],
                    ["Department", letter.departmentName],
                    ["Academic Year", letter.academicYearName],
                    ["Academic Session", letter.academicSessionName],
                    ["Admission Date", formatDate(letter.admissionDate)],
                    ["Enrolment Status", letter.enrolmentStatus],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b last:border-b-0">
                      <td className="w-56 bg-muted/40 px-4 py-2 font-medium">
                        {label}
                      </td>
                      <td className="px-4 py-2">
                        {value ? String(value) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-lg border border-slate-300 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Student Portal Account
              </p>
              <div className="mt-2 grid gap-1 text-sm">
                <p>
                  Login ID:{" "}
                  <span className="font-mono font-semibold">
                    {letter.loginId}
                  </span>
                </p>
                <p>
                  Default password:{" "}
                  <span className="font-mono font-semibold">
                    {letter.defaultPassword}
                  </span>
                </p>
                {letter.mustResetPassword && (
                  <p className="text-xs text-muted-foreground">
                    You will be required to change your password on first login.
                  </p>
                )}
              </div>
            </div>

            <p className="mt-8 text-sm leading-relaxed">
              Please report to the admissions office with a copy of this letter
              and your national identity document to complete your registration.
              We look forward to welcoming you to our institution.
            </p>

            <div className="mt-10 text-right">
              <p className="text-sm font-medium">Yours faithfully,</p>
              <p className="mt-10 text-sm font-semibold">
                {letter.institutionName}
              </p>
            </div>

            <p className="mt-10 border-t pt-4 text-center text-xs text-muted-foreground">
              This is a computer-generated admission letter and requires no
              signature.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
