"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StudentForm } from "@/components/dashboard/students/student-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudent, type StudentResponse } from "@/lib/api/students";

export default function EditStudentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;

  const [student, setStudent] = useState<StudentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
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
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  return (
    <>
      <PageToolbar
        title="Edit Student"
        description="Update personal, disability or next-of-kin details and status."
      />
      <div className="mx-[50px] mb-[30px]">
        {!id ? (
          <div className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground shadow-lg shadow-black/5">
            Missing student id.
          </div>
        ) : loading ? (
          <div className="grid gap-4 rounded-lg bg-card p-6 shadow-lg shadow-black/5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-card p-6 text-center text-sm text-muted-foreground shadow-lg shadow-black/5">
            {error}
          </div>
        ) : student ? (
          <StudentForm
            key={student.id}
            student={student}
            onSuccess={() => router.push("/student")}
            onCancel={() => router.push("/student")}
          />
        ) : null}
      </div>
    </>
  );
}
