import { apiClient } from "./client";

export interface RoleOption {
  id: number;
  name: string;
  displayName: string;
}

export interface DepartmentOption {
  id: number;
  name: string;
  code: string;
}

export interface StaffMeta {
  nextEmployeeNumber: string;
  roles: RoleOption[];
  departments: DepartmentOption[];
}

export interface StaffResponse {
  id: number;
  userId: number;
  email: string;
  roleId: number | null;
  roleName: string | null;
  employeeNumber: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  fullName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  nationalId: string | null;
  placeOfBirth: string | null;
  religion: string | null;
  phoneNumber: string | null;
  alternativePhoneNumber: string | null;
  county: string | null;
  departmentId: number | null;
  departmentName: string | null;
  departmentCode: string | null;
  jobTitle: string | null;
  employmentType: string | null;
  dateJoined: string | null;
  contractEndDate: string | null;
  kraPin: string | null;
  nhifNumber: string | null;
  nssfNumber: string | null;
  highestQualification: string | null;
  specialization: string | null;
  isPwd: boolean;
  disabilityType: string | null;
  disabilityDescription: string | null;
  nextOfKinFirstName: string | null;
  nextOfKinLastName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinAltPhone: string | null;
  nextOfKinEmail: string | null;
  nextOfKinRelationship: string | null;
  status: boolean;
  basicSalary: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffListResponse {
  items: StaffResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateStaffPayload {
  email: string;
  role: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: "male" | "female" | "other";
  dateOfBirth?: string;
  nationality?: string;
  nationalId?: string;
  placeOfBirth?: string;
  religion?: string;
  phoneNumber?: string;
  alternativePhoneNumber?: string;
  county?: string;
  departmentId?: number;
  jobTitle?: string;
  employmentType: "Permanent" | "Contract" | "Part-time" | "Casual";
  dateJoined?: string;
  contractEndDate?: string;
  basicSalary?: number;
  status?: boolean;
  kraPin?: string;
  nhifNumber?: string;
  nssfNumber?: string;
  highestQualification:
    | "PHD"
    | "Masters"
    | "Degree"
    | "Diploma"
    | "Certificate"
    | "Other";
  specialization?: string;
  isPwd?: boolean;
  disabilityType?: string;
  disabilityDescription?: string;
  nextOfKinFirstName?: string;
  nextOfKinLastName?: string;
  nextOfKinPhone?: string;
  nextOfKinAltPhone?: string;
  nextOfKinEmail?: string;
  nextOfKinRelationship:
    | "Partner"
    | "Sibling"
    | "Father"
    | "Mother"
    | "Relative"
    | "Guardian";
}

export type UpdateStaffPayload = Partial<CreateStaffPayload>;

export async function getStaffMeta(): Promise<StaffMeta> {
  const response = await apiClient.get<StaffMeta>("/staff/meta");
  return response.data;
}

export async function getStaff(
  page = 1,
  limit = 25,
  search?: string
): Promise<StaffListResponse> {
  const response = await apiClient.get<StaffListResponse>("/staff", {
    params: { page, limit, ...(search ? { search } : {}) },
  });
  return response.data;
}

export async function getStaffMember(id: number): Promise<StaffResponse> {
  const response = await apiClient.get<StaffResponse>(`/staff/${id}`);
  return response.data;
}

export async function createStaff(
  data: CreateStaffPayload
): Promise<StaffResponse> {
  const response = await apiClient.post<StaffResponse>("/staff", data);
  return response.data;
}

export async function updateStaff(
  id: number,
  data: UpdateStaffPayload
): Promise<StaffResponse> {
  const response = await apiClient.patch<StaffResponse>(`/staff/${id}`, data);
  return response.data;
}
