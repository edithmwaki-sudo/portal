import { apiClient } from "./client";

export interface CourseCurriculumItem {
  id: number;
  courseCurriculumId: number;
  cycleName: string;
  isActive: boolean;
}

export interface Course {
  id: number;
  code: string;
  initials: string;
  name: string;
  durationMonths: number | null;
  description: string | null;
  isActive: boolean;
  certificationAuthorityId: number | null;
  certificationAuthorityCode: string | null;
  certificationAuthorityName: string | null;
  certificationLevelId: number | null;
  certificationLevelCode: string | null;
  certificationLevelName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  curricula: CourseCurriculumItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CourseListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
  certificationAuthorityId?: number;
  certificationLevelId?: number;
  curriculumId?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export async function getCourses(
  params: CourseListParams = {}
): Promise<ListResponse<Course>> {
  const response = await apiClient.get<ListResponse<Course>>("/courses", {
    params,
  });
  return response.data;
}

export async function getCourse(id: number): Promise<Course> {
  const response = await apiClient.get<Course>(`/courses/${id}`);
  return response.data;
}

export interface CoursePayload {
  code: string;
  initials: string;
  name: string;
  certificationAuthorityId: number;
  certificationLevelId: number;
  departmentId: number;
  durationMonths?: number;
  description?: string;
  isActive?: boolean;
  /** Optional initial curriculum version - creates the first mapping (create only). */
  curriculumId?: number;
}

export async function createCourse(data: CoursePayload): Promise<Course> {
  const response = await apiClient.post<Course>("/courses", data);
  return response.data;
}

export async function updateCourse(
  id: number,
  data: Partial<CoursePayload>
): Promise<Course> {
  const response = await apiClient.patch<Course>(`/courses/${id}`, data);
  return response.data;
}

export async function deleteCourse(id: number): Promise<void> {
  await apiClient.delete(`/courses/${id}`);
}

export interface AsyncOption {
  id: number;
  label: string;
}

export async function getCourseAuthorityOptions(
  search: string
): Promise<AsyncOption[]> {
  const response = await apiClient.get<{ options: AsyncOption[] }>(
    "/courses/meta/authorities",
    { params: { search, limit: 10 } }
  );
  return response.data.options;
}

export async function getCourseLevelOptions(
  authorityId: number,
  search: string
): Promise<AsyncOption[]> {
  const response = await apiClient.get<{ options: AsyncOption[] }>(
    "/courses/meta/levels",
    { params: { authorityId, search, limit: 10 } }
  );
  return response.data.options;
}

export async function getCourseCurriculumOptions(
  authorityId: number,
  search: string
): Promise<AsyncOption[]> {
  const response = await apiClient.get<{ options: AsyncOption[] }>(
    "/courses/meta/curricula",
    { params: { authorityId, search, limit: 10 } }
  );
  return response.data.options;
}

/** All active levels for an authority — used to pre-populate the form. */
export async function getAllCourseLevelOptions(
  authorityId: number
): Promise<AsyncOption[]> {
  const response = await apiClient.get<{ options: AsyncOption[] }>(
    "/courses/meta/levels",
    { params: { authorityId, limit: 500 } }
  );
  return response.data.options;
}

/** All active curricula for an authority — used to pre-populate the form. */
export async function getAllCourseCurriculumOptions(
  authorityId: number
): Promise<AsyncOption[]> {
  const response = await apiClient.get<{ options: AsyncOption[] }>(
    "/courses/meta/curricula",
    { params: { authorityId, limit: 500 } }
  );
  return response.data.options;
}

export async function getCourseDepartmentOptions(
  search: string
): Promise<AsyncOption[]> {
  const response = await apiClient.get<{ options: AsyncOption[] }>(
    "/courses/meta/departments",
    { params: { search, limit: 10 } }
  );
  return response.data.options;
}

export async function getMyCourseDepartment(): Promise<{
  id: number;
  name: string;
} | null> {
  const response = await apiClient.get<{
    department: { id: number; name: string } | null;
  }>("/courses/meta/my-department");
  return response.data.department;
}
