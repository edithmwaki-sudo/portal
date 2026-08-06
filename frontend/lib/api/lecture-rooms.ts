import { apiClient } from "./client";
import type { ListResponse } from "./academic-years";

export interface LectureRoom {
  id: number;
  name: string;
  code: string;
  capacity: number | null;
  location: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LectureRoomListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
  all?: boolean;
}

export interface LectureRoomPayload {
  name: string;
  code: string;
  capacity?: number;
  location?: string;
  description?: string;
  isActive?: boolean;
}

export async function getLectureRooms(
  params: LectureRoomListParams = {}
): Promise<ListResponse<LectureRoom>> {
  const response = await apiClient.get<ListResponse<LectureRoom>>(
    "/lecture-rooms",
    { params }
  );
  return response.data;
}

export async function getLectureRoom(id: number): Promise<LectureRoom> {
  const response = await apiClient.get<LectureRoom>(`/lecture-rooms/${id}`);
  return response.data;
}

export async function createLectureRoom(
  data: LectureRoomPayload
): Promise<LectureRoom> {
  const response = await apiClient.post<LectureRoom>("/lecture-rooms", data);
  return response.data;
}

export async function updateLectureRoom(
  id: number,
  data: Partial<LectureRoomPayload>
): Promise<LectureRoom> {
  const response = await apiClient.patch<LectureRoom>(
    `/lecture-rooms/${id}`,
    data
  );
  return response.data;
}

export async function deleteLectureRoom(id: number): Promise<void> {
  await apiClient.delete(`/lecture-rooms/${id}`);
}
