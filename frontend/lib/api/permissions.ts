import { apiClient } from "./client";

export interface PermissionResponse {
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionsListResponse {
  items: PermissionResponse[];
  total: number;
  page: number;
  limit: number;
}

export async function getPermissions(
  page = 1,
  limit = 25
): Promise<PermissionsListResponse> {
  const response = await apiClient.get<PermissionsListResponse>("/permissions", {
    params: { page, limit },
  });
  return response.data;
}

export async function syncPermissions(): Promise<PermissionsListResponse> {
  const response = await apiClient.post<PermissionsListResponse>("/permissions/sync");
  return response.data;
}
