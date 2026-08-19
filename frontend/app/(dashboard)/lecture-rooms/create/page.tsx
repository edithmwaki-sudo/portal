"use client"

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { LectureRoomForm } from "@/components/dashboard/lecture-rooms/lecture-room-form";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";

export default function CreateLectureRoomPage() {
  const router = useRouter();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canAdd = hasAnyPermission(permissions, ["room.add"]);

  if (!permissionsLoading && !canAdd) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to add lecture rooms.
      </p>
    );
  }

  return (
    <>
      <PageToolbar
        title="Add Lecture Room"
        description="Create a lecture room for timetabling."
        primaryActions={[
          {
            label: "Back to Rooms",
            icon: ArrowLeft,
            href: "/lecture-rooms",
            variant: "outline",
          },
        ]}
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="w-full rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <LectureRoomForm
            onSuccess={() => router.push("/lecture-rooms")}
            onCancel={() => router.push("/lecture-rooms")}
          />
        </div>
      </div>
    </>
  );
}
