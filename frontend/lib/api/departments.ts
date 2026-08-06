import { apiClient } from "./client";
import type { DepartmentValues } from "@/schemas/department-schema";

export interface Department {
  id: number;
  code: string;
  name: string;
  headOfDepartmentId: number | null;
  headOfDepartmentName: string | null;
  headOfDepartmentEmployeeNumber: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HeadOfDepartmentOption {
  id: number;
  employeeNumber: string | null;
  name: string;
  jobTitle: string | null;
  label: string;
}

export interface DepartmentsListResponse {
  items: Department[];
  total: number;
  page: number;
  limit: number;
}

export async function getDepartments(
  page = 1,
  limit = 25,
  search?: string
): Promise<DepartmentsListResponse> {
  const response = await apiClient.get<DepartmentsListResponse>("/departments", {
    params: { page, limit, ...(search ? { search } : {}) },
  });
  return response.data;
}

export async function getDepartment(id: number): Promise<Department> {
  const response = await apiClient.get<Department>(`/departments/${id}`);
  return response.data;
}

export async function createDepartment(
  data: Omit<DepartmentValues, "headOfDepartmentId"> & {
    headOfDepartmentId?: number;
  }
): Promise<Department> {
  const response = await apiClient.post<Department>("/departments", data);
  return response.data;
}

export async function updateDepartment(
  id: number,
  data: Omit<DepartmentValues, "headOfDepartmentId"> & {
    headOfDepartmentId?: number;
  }
): Promise<Department> {
  const response = await apiClient.patch<Department>(`/departments/${id}`, data);
  return response.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await apiClient.delete(`/departments/${id}`);
}

export async function getHeadOfDepartmentOptions(
  search?: string
): Promise<HeadOfDepartmentOption[]> {
  const response = await apiClient.get<{
    headOfDepartmentOptions: HeadOfDepartmentOption[];
  }>("/departments/meta", {
    params: {
      ...(search ? { search } : {}),
      limit: 10,
    },
  });
  return response.data.headOfDepartmentOptions;
}