"use client"

import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { CourseForm } from "@/components/dashboard/courses/course-form";

export default function CreateCoursePage() {
  const router = useRouter();

  return (
    <>
      <PageToolbar
        title="Add Course"
        description="Create a course for a certification authority and level."
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <CourseForm
            onSuccess={() => router.push("/courses")}
            onCancel={() => router.push("/courses")}
          />
        </div>
      </div>
    </>
  );
}
