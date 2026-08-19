"use client"

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { LectureRoomForm } from "@/components/dashboard/lecture-rooms/lecture-room-form";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getLectureRoom, deleteLectureRoom } from "@/lib/api/lecture-rooms";
import { usePermissions, hasAnyPermission } from "@/hooks/use-current-user";
import { toast } from "sonner";
import axios from "axios";

export default function EditLectureRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id")) || undefined;
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canEdit = hasAnyPermission(permissions, ["room.edit"]);
  const canDelete = hasAnyPermission(permissions, ["room.delete"]);

  const [room, setRoom] = useState<Awaited<ReturnType<typeof getLectureRoom>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || (permissionsLoading && !canEdit)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLectureRoom(id)
      .then((data) => {
        if (!cancelled) setRoom(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the room.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, permissionsLoading, canEdit]);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteLectureRoom(id);
      toast.success("Room deleted successfully");
      router.push("/lecture-rooms");
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!permissionsLoading && !canEdit) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to edit lecture rooms.
      </p>
    );
  }

  return (
    <>
      <PageToolbar
        title="Edit Lecture Room"
        description={room ? `${room.code} ${room.name}`.trim() : "Update a room."}
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
          {!id ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Missing room id.
            </p>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading room...
            </p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : !room ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Room not found.
            </p>
          ) : (
            <>
              <LectureRoomForm
                room={room}
                onSuccess={() => router.push("/lecture-rooms")}
                onCancel={() => router.push("/lecture-rooms")}
              />
              {canDelete && (
                <div className="mt-8 border-t pt-6">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deleting}>
                        Delete Room
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete lecture room?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove "{room.name}" from the
                          room list. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={deleting}
                          onClick={(event) => {
                            event.preventDefault();
                            handleDelete();
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
