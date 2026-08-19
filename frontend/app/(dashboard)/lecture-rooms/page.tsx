"use client"

import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getLectureRooms, type LectureRoom } from "@/lib/api/lecture-rooms";
import {
  usePermissions,
  hasAnyPermission,
} from "@/hooks/use-current-user";

export default function LectureRoomsPage() {
  const router = useRouter();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const canView = hasAnyPermission(permissions, ["room.view"]);
  const canAdd = hasAnyPermission(permissions, ["room.add"]);
  const canEdit = hasAnyPermission(permissions, ["room.edit"]);

  const [rooms, setRooms] = useState<LectureRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);

  const loadRooms = useCallback(() => {
    setLoading(true);
    setError(null);
    getLectureRooms({
      page: 1,
      limit: 100,
      search: query.trim() || undefined,
    })
      .then((data) => {
        setRooms(data.items);
        setTotal(data.total);
      })
      .catch(() => setError("Failed to load lecture rooms. Please try again."))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    if (!permissionsLoading && canView) {
      const timer = setTimeout(loadRooms, 300);
      return () => clearTimeout(timer);
    }
  }, [permissionsLoading, canView, loadRooms, refresh]);

  const applySearch = useCallback(() => setQuery(search), [search]);

  if (!permissionsLoading && !canView) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view lecture rooms.
      </p>
    );
  }

  return (
    <>
      <PageToolbar
        title="Lecture Rooms"
        description={`${total} room${total === 1 ? "" : "s"} on record.`}
        primaryActions={
          canAdd
            ? [
                {
                  label: "Add Room",
                  icon: Plus,
                  href: "/lecture-rooms/create",
                },
              ]
            : undefined
        }
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px]">
        <div className="overflow-hidden rounded-lg bg-card shadow-lg shadow-black/5">
          <div className="border-b px-4 py-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search rooms..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applySearch();
                    }
                  }}
                  className="max-w-xs"
                />
                <Button type="button" variant="outline" onClick={applySearch}>
                  Search
                </Button>
              </div>
            </div>
          </div>
          {loading ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              Loading lecture rooms...
            </p>
          ) : error ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : rooms.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              No lecture rooms found. Add one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-12 px-4">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell>{room.code}</TableCell>
                    <TableCell>
                      {room.capacity !== null && room.capacity !== undefined
                        ? room.capacity
                        : "—"}
                    </TableCell>
                    <TableCell>{room.location ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          room.isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {room.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${room.name}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/lecture-rooms/edit?id=${room.id}`)
                              }
                            >
                              <Pencil />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
