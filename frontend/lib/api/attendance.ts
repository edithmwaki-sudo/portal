import { apiClient } from "./client";

export interface AssignedUnit {
  id: number;
  code: string;
  name: string;
  sessions: {
    id: number;
    name: string;
    isActive: boolean;
  }[];
}

export interface RosterStudent {
  id: number;
  name: string;
  admissionNumber: string | null;
  level: number | null;
}

export interface AttendanceEntry {
  id: number;
  unitId: number;
  studentUserId: number | null;
  trainerUserId: number | null;
  sessionDate: string;
  startTime: string;
  status: string;
  remarks: string | null;
  student: { id: number; name: string; admissionNumber: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarkAttendancePayload {
  unitId: number;
  trainerUserId?: number;
  sessionDate: string;
  startTime: string;
  studentUserIds: number[];
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
}

export async function getAssignedUnits(): Promise<AssignedUnit[]> {
  const response = await apiClient.get<AssignedUnit[]>("/attendance/my-units");
  return response.data;
}

export async function getUnitRoster(
  unitId: number,
  search?: string
): Promise<RosterStudent[]> {
  const response = await apiClient.get<RosterStudent[]>(
    `/attendance/units/${unitId}/roster`,
    { params: search ? { search } : {} }
  );
  return response.data;
}

export async function getAttendanceRecords(
  unitId: number,
  sessionDate?: string
): Promise<AttendanceEntry[]> {
  const response = await apiClient.get<AttendanceEntry[]>(
    `/attendance/units/${unitId}/records`,
    { params: sessionDate ? { sessionDate } : {} }
  );
  return response.data;
}

export async function markAttendance(
  data: MarkAttendancePayload
): Promise<{ marked: number; status: string }> {
  const response = await apiClient.post<{ marked: number; status: string }>(
    "/attendance/mark",
    data
  );
  return response.data;
}
