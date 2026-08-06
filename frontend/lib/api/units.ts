import { apiClient } from "./client";

export interface UnitCourse {
  id: number;
  code: string;
  initials: string;
  name: string;
}

export interface UnitCurriculum {
  id: number;
  cycleName: string;
}

export interface Unit {
  id: number;
  courseId: number;
  curriculumId: number;
  code: string;
  name: string;
  description: string | null;
  modulesTaught: number | null;
  taughtHours: number | null;
  creditFactor: number | null;
  isActive: boolean;
  course: UnitCourse | null;
  curriculum: UnitCurriculum | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UnitListParams {
  page?: number;
  limit?: number;
  courseId?: number;
  curriculumId?: number;
  search?: string;
  status?: "active" | "inactive";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export async function getUnits(
  params: UnitListParams = {}
): Promise<ListResponse<Unit>> {
  const response = await apiClient.get<ListResponse<Unit>>("/units", {
    params,
  });
  return response.data;
}

export async function getUnit(id: number): Promise<Unit> {
  const response = await apiClient.get<Unit>(`/units/${id}`);
  return response.data;
}

export interface UnitPayload {
  courseId: number;
  curriculumId: number;
  code: string;
  name: string;
  description?: string;
  modulesTaught?: number;
  taughtHours?: number;
  creditFactor?: number;
  isActive?: boolean;
}

export async function createUnit(data: UnitPayload): Promise<Unit> {
  const response = await apiClient.post<Unit>("/units", data);
  return response.data;
}

export async function updateUnit(
  id: number,
  data: Partial<UnitPayload>
): Promise<Unit> {
  const response = await apiClient.patch<Unit>(`/units/${id}`, data);
  return response.data;
}

export async function deleteUnit(id: number): Promise<void> {
  await apiClient.delete(`/units/${id}`);
}
