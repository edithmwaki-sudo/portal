import { apiClient } from "./client";

export interface AcademicYear {
  id: number;
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  isActive: boolean;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AcademicYearListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
}

export interface AcademicYearPayload {
  code: string;
  name: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  isActive?: boolean;
  sessionsPerYear?: number;
}

export async function getAcademicYears(
  params: AcademicYearListParams = {}
): Promise<ListResponse<AcademicYear>> {
  const response = await apiClient.get<ListResponse<AcademicYear>>(
    "/academic-years",
    { params }
  );
  return response.data;
}

export async function getAcademicYear(id: number): Promise<AcademicYear> {
  const response = await apiClient.get<AcademicYear>(`/academic-years/${id}`);
  return response.data;
}

export async function createAcademicYear(
  data: AcademicYearPayload
): Promise<AcademicYear> {
  const response = await apiClient.post<AcademicYear>("/academic-years", data);
  return response.data;
}

export async function updateAcademicYear(
  id: number,
  data: Partial<AcademicYearPayload>
): Promise<AcademicYear> {
  const response = await apiClient.patch<AcademicYear>(
    `/academic-years/${id}`,
    data
  );
  return response.data;
}

export async function deleteAcademicYear(id: number): Promise<void> {
  await apiClient.delete(`/academic-years/${id}`);
}
