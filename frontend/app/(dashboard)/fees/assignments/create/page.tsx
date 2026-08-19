"use client"

import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { CourseFeeAssignmentForm } from "@/components/dashboard/fees/course-fee-assignment-form";

export default function CreateCourseFeeAssignmentPage() {
  const router = useRouter();

  return (
    <>
      <PageToolbar
        title="Add Course Fee Assignment"
        description="Assign a fee structure to a course within a curriculum period."
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <CourseFeeAssignmentForm
            onSuccess={() => router.push("/fees/assignments")}
            onCancel={() => router.push("/fees/assignments")}
          />
        </div>
      </div>
    </>
  );
}
