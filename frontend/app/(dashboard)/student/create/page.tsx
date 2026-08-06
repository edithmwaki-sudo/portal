"use client"

import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { StudentForm } from "@/components/dashboard/users/student-form";

export default function CreateStudentPage() {
  const router = useRouter();

  return (
    <>
      <PageToolbar
        title="Add Student"
        description="Admit a student and create their account and admission record."
      />
      <div className="mx-[50px] mb-[30px]">
        <div className="w-full rounded-lg bg-white p-6 shadow-lg shadow-black/5">
          <StudentForm
            onSuccess={() => router.push("/student")}
            onCancel={() => router.push("/student")}
          />
        </div>
      </div>
    </>
  );
}
