import { apiClient } from "./client";

export type FeeStatus = "ACTIVE" | "INACTIVE";

export interface FeeItem {
  id: number;
  itemName: string;
  amount: number;
  displayOrder: number;
}

export interface FeeStructure {
  id: number;
  feeName: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: FeeStatus;
  itemsCount: number;
  items?: FeeItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureListResponse {
  items: FeeStructure[];
  total: number;
  page: number;
  limit: number;
}

export interface FeeStructureOption {
  id: number;
  feeName: string;
  label: string;
}

export interface CourseFeeAssignment {
  id: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  curriculumId: number;
  curriculumName: string;
  academicYearId: number;
  academicYearName: string;
  academicSessionId: number;
  academicSessionName: string;
  feeStructureId: number;
  feeStructureName: string;
  feeStructureStatus: FeeStatus;
  itemsCount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  remarks: string | null;
  status: FeeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseFeeAssignmentListResponse {
  items: CourseFeeAssignment[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateFeeStructurePayload {
  feeName: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status?: FeeStatus;
  items: { itemName: string; amount: number; displayOrder?: number }[];
}

export type UpdateFeeStructurePayload = Partial<CreateFeeStructurePayload>;

export interface CreateCourseFeeAssignmentPayload {
  courseId: number;
  curriculumId: number;
  academicYearId: number;
  academicSessionId: number;
  feeStructureId: number;
  effectiveFrom: string;
  effectiveTo?: string;
  remarks?: string;
  status?: FeeStatus;
}

export type UpdateCourseFeeAssignmentPayload = Partial<CreateCourseFeeAssignmentPayload>;

// ---------------------------------------------------------------
// Fee structures
// ---------------------------------------------------------------

export async function getFeeStructures(
  page = 1,
  limit = 25,
  search?: string,
  status?: string
): Promise<FeeStructureListResponse> {
  const response = await apiClient.get<FeeStructureListResponse>(
    "/fee-structures",
    {
      params: {
        page,
        limit,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      },
    }
  );
  return response.data;
}

export async function getFeeStructure(id: number): Promise<FeeStructure> {
  const response = await apiClient.get<FeeStructure>(`/fee-structures/${id}`);
  return response.data;
}

export async function createFeeStructure(
  data: CreateFeeStructurePayload
): Promise<FeeStructure> {
  const response = await apiClient.post<FeeStructure>("/fee-structures", data);
  return response.data;
}

export async function updateFeeStructure(
  id: number,
  data: UpdateFeeStructurePayload
): Promise<FeeStructure> {
  const response = await apiClient.patch<FeeStructure>(
    `/fee-structures/${id}`,
    data
  );
  return response.data;
}

export async function deleteFeeStructure(id: number): Promise<void> {
  await apiClient.delete(`/fee-structures/${id}`);
}

export async function getFeeStructureOptions(
  search?: string
): Promise<FeeStructureOption[]> {
  const response = await apiClient.get<{ options: FeeStructureOption[] }>(
    "/fee-structures/meta",
    {
      params: {
        ...(search ? { search } : {}),
        limit: 10,
      },
    }
  );
  return response.data.options;
}

// ---------------------------------------------------------------
// Course fee assignments
// ---------------------------------------------------------------

export interface CourseFeeAssignmentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  courseId?: number;
  curriculumId?: number;
  academicYearId?: number;
  academicSessionId?: number;
}

export async function getCourseFeeAssignments(
  filters: CourseFeeAssignmentFilters = {}
): Promise<CourseFeeAssignmentListResponse> {
  const { page = 1, limit = 25, ...rest } = filters;
  const response = await apiClient.get<CourseFeeAssignmentListResponse>(
    "/course-fee-assignments",
    {
      params: {
        page,
        limit,
        ...(rest.search ? { search: rest.search } : {}),
        ...(rest.status ? { status: rest.status } : {}),
        ...(rest.courseId ? { courseId: rest.courseId } : {}),
        ...(rest.curriculumId ? { curriculumId: rest.curriculumId } : {}),
        ...(rest.academicYearId ? { academicYearId: rest.academicYearId } : {}),
        ...(rest.academicSessionId
          ? { academicSessionId: rest.academicSessionId }
          : {}),
      },
    }
  );
  return response.data;
}

export async function getCourseFeeAssignment(
  id: number
): Promise<CourseFeeAssignment> {
  const response = await apiClient.get<CourseFeeAssignment>(
    `/course-fee-assignments/${id}`
  );
  return response.data;
}

export async function createCourseFeeAssignment(
  data: CreateCourseFeeAssignmentPayload
): Promise<CourseFeeAssignment> {
  const response = await apiClient.post<CourseFeeAssignment>(
    "/course-fee-assignments",
    data
  );
  return response.data;
}

export async function updateCourseFeeAssignment(
  id: number,
  data: UpdateCourseFeeAssignmentPayload
): Promise<CourseFeeAssignment> {
  const response = await apiClient.patch<CourseFeeAssignment>(
    `/course-fee-assignments/${id}`,
    data
  );
  return response.data;
}

export async function deleteCourseFeeAssignment(id: number): Promise<void> {
  await apiClient.delete(`/course-fee-assignments/${id}`);
}
