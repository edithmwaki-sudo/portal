import { apiClient } from "./client";

export type StudentStatus = "ACTIVE" | "INACTIVE" | "GRADUATED";
export type StudentGender = "MALE" | "FEMALE" | "OTHER";

export interface StudentUser {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  name: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  gender: StudentGender | null;
  dateOfBirth: string | null;
  nationality: string | null;
  placeOfBirth: string | null;
  religion: string | null;
  county: string | null;
  alternativePhoneNumber: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  isPwd: boolean;
  disabilityType: string | null;
  disabilityDescription: string | null;
  mustResetPassword: boolean;
  status: string;
  role: { id: number; name: string; displayName: string } | null;
}

export interface CourseEnrolment {
  id: number;
  courseCurriculumId: number;
  courseId: number | null;
  courseName: string | null;
  courseCode: string | null;
  courseInitials: string | null;
  departmentName: string | null;
  authorityName: string | null;
  certificationAuthorityId: number | null;
  levelName: string | null;
  certificationLevelId: number | null;
  curriculumId: number | null;
  curriculumName: string | null;
  academicSessionId: number | null;
  academicSessionName: string | null;
  academicYearId: number | null;
  academicYearName: string | null;
  enrolmentDate: string | null;
  status: string;
  remarks: string | null;
}

export interface StudentResponse {
  id: number;
  admissionNumber: string | null;
  nationalId: string | null;
  courseId: number | null;
  level: number | null;
  admDate: string | null;
  status: StudentStatus | null;
  nextOfKinFirstName: string | null;
  nextOfKinLastName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinAltPhone: string | null;
  nextOfKinEmail: string | null;
  nextOfKinRelationship: string | null;
  createdAt: string;
  updatedAt: string;
  user: StudentUser;
  activeEnrolment: CourseEnrolment | null;
}

export interface StudentsListResponse {
  items: StudentResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateStudentPayload {
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: StudentGender;
  dateOfBirth?: string;
  nationality?: string;
  nationalId?: string;
  placeOfBirth?: string;
  religion?: string;
  phone: string;
  alternativePhoneNumber?: string;
  county?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  isPwd?: boolean;
  disabilityType?: string;
  disabilityDescription?: string;
  nextOfKinFirstName?: string;
  nextOfKinLastName?: string;
  nextOfKinPhone?: string;
  nextOfKinAltPhone?: string;
  nextOfKinEmail?: string;
  nextOfKinRelationship?: string;
  courseId: number;
  curriculumId: number;
  level?: number;
  admDate?: string;
  status?: StudentStatus;
}

export type UpdateStudentPayload = Partial<CreateStudentPayload>;

export interface StudentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  courseId?: number;
  curriculumId?: number;
  level?: number;
}

export interface NextAdmissionNumberMeta {
  courseId: number;
  courseName: string;
  nextAdmissionNumber: string;
}

export interface AdmissionLetter {
  referenceNumber: string | null;
  date: string;
  studentName: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  admissionNumber: string | null;
  nationalId: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  placeOfBirth: string | null;
  religion: string | null;
  phone: string | null;
  email: string;
  address: string | null;
  city: string | null;
  county: string | null;
  postalCode: string | null;
  courseName: string | null;
  courseCode: string | null;
  courseInitials: string | null;
  departmentName: string | null;
  certificationAuthorityName: string | null;
  certificationLevelName: string | null;
  curriculumName: string | null;
  academicSessionName: string | null;
  academicYearName: string | null;
  admissionDate: string | null;
  enrolmentStatus: string | null;
  loginId: string | null;
  defaultPassword: string | null;
  mustResetPassword: boolean;
  institutionName: string;
}

export async function getStudents(
  filters: StudentFilters = {}
): Promise<StudentsListResponse> {
  const { page = 1, limit = 25, ...rest } = filters;
  const response = await apiClient.get<StudentsListResponse>("/students", {
    params: {
      page,
      limit,
      ...(rest.search ? { search: rest.search } : {}),
      ...(rest.status ? { status: rest.status } : {}),
      ...(rest.courseId ? { courseId: rest.courseId } : {}),
      ...(rest.curriculumId ? { curriculumId: rest.curriculumId } : {}),
      ...(rest.level ? { level: rest.level } : {}),
    },
  });
  return response.data;
}

export async function getStudent(id: number): Promise<StudentResponse> {
  const response = await apiClient.get<StudentResponse>(`/students/${id}`);
  return response.data;
}

export async function createStudent(
  data: CreateStudentPayload
): Promise<StudentResponse> {
  const response = await apiClient.post<StudentResponse>("/students", data);
  return response.data;
}

export async function updateStudent(
  id: number,
  data: UpdateStudentPayload
): Promise<StudentResponse> {
  const response = await apiClient.patch<StudentResponse>(`/students/${id}`, data);
  return response.data;
}

export async function deleteStudent(id: number): Promise<void> {
  await apiClient.delete(`/students/${id}`);
}

/** Preview the next sequential admission number for a course. */
export async function getNextAdmissionNumber(
  courseId: number
): Promise<NextAdmissionNumberMeta> {
  const response = await apiClient.get<NextAdmissionNumberMeta>("/students/meta", {
    params: { courseId },
  });
  return response.data;
}

export async function getAdmissionLetter(id: number): Promise<AdmissionLetter> {
  const response = await apiClient.get<AdmissionLetter>(
    `/students/${id}/admission-letter`
  );
  return response.data;
}

/** Download a CSV of students respecting the current filters. */
export async function exportStudents(
  filters: StudentFilters = {}
): Promise<void> {
  const { search, status, courseId, curriculumId, level } = filters;
  const response = await apiClient.get<Blob>("/students/export", {
    params: {
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(courseId ? { courseId } : {}),
      ...(curriculumId ? { curriculumId } : {}),
      ...(level ? { level } : {}),
    },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
