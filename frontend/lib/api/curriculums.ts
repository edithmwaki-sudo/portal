import { apiClient } from "./client";

export interface Curriculum {
  id: number;
  certificationAuthorityId: number;
  certificationAuthorityCode: string | null;
  certificationAuthorityName: string | null;
  cycleName: string;
  isActive: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export async function getCurricula(
  page = 1,
  limit = 100,
  search?: string,
  certificationAuthorityId?: number
): Promise<ListResponse<Curriculum>> {
  const response = await apiClient.get<ListResponse<Curriculum>>("/curriculum", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
      ...(certificationAuthorityId ? { certificationAuthorityId } : {}),
    },
  });
  return response.data;
}

export async function getCurriculum(id: number): Promise<Curriculum> {
  const response = await apiClient.get<Curriculum>(`/curriculum/${id}`);
  return response.data;
}

export async function createCurriculum(data: {
  certificationAuthorityId: number;
  cycleName: string;
}): Promise<Curriculum> {
  const response = await apiClient.post<Curriculum>("/curriculum", data);
  return response.data;
}

export async function updateCurriculum(
  id: number,
  data: Partial<{
    certificationAuthorityId: number;
    cycleName: string;
  }>
): Promise<Curriculum> {
  const response = await apiClient.patch<Curriculum>(`/curriculum/${id}`, data);
  return response.data;
}

export async function toggleCurriculumActive(id: number): Promise<Curriculum> {
  const response = await apiClient.patch<Curriculum>(
    `/curriculum/${id}/toggle-active`
  );
  return response.data;
}

export async function deleteCurriculum(id: number): Promise<void> {
  await apiClient.delete(`/curriculum/${id}`);
}
