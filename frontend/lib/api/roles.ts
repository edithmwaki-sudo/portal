import { apiClient } from "./client";
import type { CreateRoleValues } from "@/schemas/role-schema";

export interface RolePermission {
  name: string;
  description?: string;
}

export interface RoleResponse {
  id: number;
  name: string;
  displayName: string;
  permissions: RolePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface RolesListResponse {
  items: RoleResponse[];
  total: number;
  page: number;
  limit: number;
}

export async function getRoles(
  page = 1,
  limit = 25,
  search?: string
): Promise<RolesListResponse> {
  const response = await apiClient.get<RolesListResponse>("/roles", {
    params: { page, limit, ...(search ? { search } : {}) },
  });
  return response.data;
}

export async function createRole(data: CreateRoleValues): Promise<RoleResponse> {
  const response = await apiClient.post<RoleResponse>("/roles", data);
  return response.data;
}

export async function getRole(id: number): Promise<RoleResponse> {
  const response = await apiClient.get<RoleResponse>(`/roles/${id}`);
  return response.data;
}

export async function updateRole(
  id: number,
  data: CreateRoleValues
): Promise<RoleResponse> {
  const response = await apiClient.patch<RoleResponse>(`/roles/${id}`, data);
  return response.data;
}

export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`/roles/${id}`);
}

export async function attachPermission(
  roleId: number,
  permissionName: string
): Promise<RoleResponse> {
  const response = await apiClient.post<RoleResponse>(
    `/roles/${roleId}/permissions/${permissionName}`
  );
  return response.data;
}

export async function detachPermission(
  roleId: number,
  permissionName: string
): Promise<void> {
  await apiClient.delete(`/roles/${roleId}/permissions/${permissionName}`);
}
