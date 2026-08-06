import { apiClient } from "./client";

export interface CertificationAuthority {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  levelsCount: number;
  createdAt: string;
  updatedAt: string;
  levels?: CertificationLevel[];
}

export interface CertificationLevel {
  id: number;
  certificationAuthorityId: number;
  certificationAuthorityCode: string | null;
  certificationAuthorityName: string | null;
  code: string;
  name: string;
  entryGrade: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CertificationGrade {
  id: number;
  certificationAuthorityId: number;
  grade: string;
  gradeStart: number;
  gradeEnd: number;
  remark: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorityOption {
  id: number;
  label: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/* ------------------------- Authorities ------------------------- */

export async function getCertificationAuthorities(
  page = 1,
  limit = 100,
  search?: string
): Promise<ListResponse<CertificationAuthority>> {
  const response = await apiClient.get<ListResponse<CertificationAuthority>>(
    "/certification-authorities",
    {
      params: { page, limit, ...(search ? { search } : {}) },
    }
  );
  return response.data;
}

export async function getCertificationAuthority(
  id: number
): Promise<CertificationAuthority> {
  const response = await apiClient.get<CertificationAuthority>(
    `/certification-authorities/${id}`
  );
  return response.data;
}

export async function getAuthorityOptions(
  search?: string
): Promise<AuthorityOption[]> {
  const response = await apiClient.get<{ options: AuthorityOption[] }>(
    "/certification-authorities/meta",
    { params: { ...(search ? { search } : {}), limit: 10 } }
  );
  return response.data.options;
}

export async function createCertificationAuthority(data: {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}): Promise<CertificationAuthority> {
  const response = await apiClient.post<CertificationAuthority>(
    "/certification-authorities",
    data
  );
  return response.data;
}

export async function updateCertificationAuthority(
  id: number,
  data: Partial<{
    code: string;
    name: string;
    description?: string;
    isActive?: boolean;
  }>
): Promise<CertificationAuthority> {
  const response = await apiClient.patch<CertificationAuthority>(
    `/certification-authorities/${id}`,
    data
  );
  return response.data;
}

export async function deleteCertificationAuthority(id: number): Promise<void> {
  await apiClient.delete(`/certification-authorities/${id}`);
}

/* --------------------------- Levels --------------------------- */

export async function getCertificationLevels(
  page = 1,
  limit = 100,
  search?: string,
  certificationAuthorityId?: number
): Promise<ListResponse<CertificationLevel>> {
  const response = await apiClient.get<ListResponse<CertificationLevel>>(
    "/certification-levels",
    {
      params: {
        page,
        limit,
        ...(search ? { search } : {}),
        ...(certificationAuthorityId
          ? { certificationAuthorityId }
          : {}),
      },
    }
  );
  return response.data;
}

export async function getCertificationLevel(
  id: number
): Promise<CertificationLevel> {
  const response = await apiClient.get<CertificationLevel>(
    `/certification-levels/${id}`
  );
  return response.data;
}

export async function createCertificationLevel(data: {
  certificationAuthorityId: number;
  code: string;
  name: string;
  entryGrade?: string;
  description?: string;
  isActive?: boolean;
}): Promise<CertificationLevel> {
  const response = await apiClient.post<CertificationLevel>(
    "/certification-levels",
    data
  );
  return response.data;
}

export async function updateCertificationLevel(
  id: number,
  data: Partial<{
    certificationAuthorityId: number;
    code: string;
    name: string;
    entryGrade?: string;
    description?: string;
    isActive?: boolean;
  }>
): Promise<CertificationLevel> {
  const response = await apiClient.patch<CertificationLevel>(
    `/certification-levels/${id}`,
    data
  );
  return response.data;
}

export async function deleteCertificationLevel(id: number): Promise<void> {
  await apiClient.delete(`/certification-levels/${id}`);
}

/* --------------------------- Grades --------------------------- */

export async function getCertificationGrades(
  certificationAuthorityId: number,
  page = 1,
  limit = 100,
  search?: string
): Promise<ListResponse<CertificationGrade>> {
  const response = await apiClient.get<ListResponse<CertificationGrade>>(
    `/certification-authorities/${certificationAuthorityId}/grades`,
    { params: { page, limit, ...(search ? { search } : {}) } }
  );
  return response.data;
}

export async function getCertificationGrade(
  certificationAuthorityId: number,
  id: number
): Promise<CertificationGrade> {
  const response = await apiClient.get<CertificationGrade>(
    `/certification-authorities/${certificationAuthorityId}/grades/${id}`
  );
  return response.data;
}

export async function createCertificationGrade(
  certificationAuthorityId: number,
  data: {
    grade: string;
    gradeStart: number;
    gradeEnd: number;
    remark?: string;
    isActive?: boolean;
  }
): Promise<CertificationGrade> {
  const response = await apiClient.post<CertificationGrade>(
    `/certification-authorities/${certificationAuthorityId}/grades`,
    data
  );
  return response.data;
}

export async function updateCertificationGrade(
  certificationAuthorityId: number,
  id: number,
  data: Partial<{
    grade: string;
    gradeStart: number;
    gradeEnd: number;
    remark?: string;
    isActive?: boolean;
  }>
): Promise<CertificationGrade> {
  const response = await apiClient.patch<CertificationGrade>(
    `/certification-authorities/${certificationAuthorityId}/grades/${id}`,
    data
  );
  return response.data;
}

export async function deleteCertificationGrade(
  certificationAuthorityId: number,
  id: number
): Promise<void> {
  await apiClient.delete(
    `/certification-authorities/${certificationAuthorityId}/grades/${id}`
  );
}