"use client"

import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StudentForm } from "@/components/dashboard/students/student-form";

export default function CreateStudentPage() {
  const router = useRouter();

  return (
    <>
      <PageToolbar
        title="Admit Student"
        description="Create the student account, admission record and course enrolment."
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <StudentForm
          onSuccess={() => router.push("/student")}
          onCancel={() => router.push("/student")}
        />
      </div>
    </>
  );
}
