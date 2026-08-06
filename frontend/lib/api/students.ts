import { apiClient } from "./client";

export interface StudentUser {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  name: string;
  gender: string | null;
  status: string;
  role: { id: number; name: string; displayName: string } | null;
  mustResetPassword: boolean;
}

export interface StudentResponse {
  id: number;
  admissionNumber: string | null;
  courseId: number | null;
  level: number | null;
  admDate: string | null;
  status: string | null;
  createdAt: string;
  user: StudentUser;
}

export interface StudentsListResponse {
  items: StudentResponse[];
  total: number;
  page: number;
  limit: number;
}

export async function getStudents(
  page = 1,
  limit = 25,
  search?: string
): Promise<StudentsListResponse> {
  const response = await apiClient.get<StudentsListResponse>("/students", {
    params: { page, limit, ...(search ? { search } : {}) },
  });
  return response.data;
}

export async function getStudent(id: number): Promise<StudentResponse> {
  const response = await apiClient.get<StudentResponse>(`/students/${id}`);
  return response.data;
}

export async function createStudent(
  data: Record<string, unknown>
): Promise<StudentResponse> {
  const response = await apiClient.post<StudentResponse>("/students", data);
  return response.data;
}
