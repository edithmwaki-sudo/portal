import { apiClient } from "./client";
import type {
  CreateUserValues,
  ResetUserPasswordValues,
  UpdateUserValues,
} from "@/schemas/user-schema";

export interface UserRole {
  id: number;
  name: string;
  displayName: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  name: string;
  gender: string | null;
  status: string;
  role: UserRole | null;
  mustResetPassword: boolean;
  twoFactorEnabled: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UsersListResponse {
  items: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

export async function getUsers(
  page = 1,
  limit = 25,
  search?: string,
  type?: "staff" | "student"
): Promise<UsersListResponse> {
  const response = await apiClient.get<UsersListResponse>("/users", {
    params: {
      page,
      limit,
      ...(search ? { search } : {}),
      ...(type ? { type } : {}),
    },
  });
  return response.data;
}

export async function getUser(id: number): Promise<UserResponse> {
  const response = await apiClient.get<UserResponse>(`/users/${id}`);
  return response.data;
}

export async function createUser(data: CreateUserValues): Promise<UserResponse> {
  const response = await apiClient.post<UserResponse>("/users", data);
  return response.data;
}

export async function updateUser(
  id: number,
  data: UpdateUserValues
): Promise<UserResponse> {
  const response = await apiClient.patch<UserResponse>(`/users/${id}`, data);
  return response.data;
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}

export async function resetUserPassword(
  id: number,
  data: ResetUserPasswordValues
): Promise<UserResponse> {
  const response = await apiClient.post<UserResponse>(
    `/users/${id}/reset-password`,
    data
  );
  return response.data;
}