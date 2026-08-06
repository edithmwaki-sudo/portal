import { apiClient } from "./client";
import type { ListResponse } from "./academic-years";

export interface AcademicSession {
  id: number;
  academicYearId: number;
  yearCode: string;
  yearName: string;
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  isActive: boolean;
  eventCount: number;
  timetableCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSessionListParams {
  page?: number;
  limit?: number;
  academicYearId?: number;
  search?: string;
}

export interface AcademicSessionPayload {
  academicYearId: number;
  code: string;
  name: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  isActive?: boolean;
}

export async function getAcademicSessions(
  params: AcademicSessionListParams = {}
): Promise<ListResponse<AcademicSession>> {
  const response = await apiClient.get<ListResponse<AcademicSession>>(
    "/academic-sessions",
    { params }
  );
  return response.data;
}

export async function getAcademicSession(
  id: number
): Promise<AcademicSession> {
  const response = await apiClient.get<AcademicSession>(
    `/academic-sessions/${id}`
  );
  return response.data;
}

export async function createAcademicSession(
  data: AcademicSessionPayload
): Promise<AcademicSession> {
  const response = await apiClient.post<AcademicSession>(
    "/academic-sessions",
    data
  );
  return response.data;
}

export async function updateAcademicSession(
  id: number,
  data: Partial<AcademicSessionPayload>
): Promise<AcademicSession> {
  const response = await apiClient.patch<AcademicSession>(
    `/academic-sessions/${id}`,
    data
  );
  return response.data;
}

export async function deleteAcademicSession(id: number): Promise<void> {
  await apiClient.delete(`/academic-sessions/${id}`);
}
