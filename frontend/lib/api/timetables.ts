import { apiClient } from "./client";

export interface TimetableUnit {
  id: number;
  code: string;
  name: string;
}

export interface TimetableTrainer {
  id: number;
  employeeNumber: string | null;
  isTeachingStaff: boolean;
  name: string;
  email: string;
}

export interface TimetableRoom {
  id: number;
  name: string;
  code: string;
}

export interface TimetableEntry {
  id: number;
  academicSessionId: number;
  unitId: number;
  trainerStaffId: number | null;
  lectureRoomId: number | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: string;
  recurrence: string;
  date: string | null;
  notes: string | null;
  unit: TimetableUnit | null;
  trainer: { id: number; name: string; employeeNumber: string | null } | null;
  room: TimetableRoom | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEntryPayload {
  academicSessionId: number;
  unitId: number;
  trainerStaffId?: number;
  lectureRoomId?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type?: string;
  recurrence?: string;
  date?: string;
  notes?: string;
}

export async function getTimetableEntries(
  sessionId: number
): Promise<TimetableEntry[]> {
  const response = await apiClient.get<TimetableEntry[]>(
    `/timetables/sessions/${sessionId}/entries`
  );
  return response.data;
}

export async function getTimetableEntry(id: number): Promise<TimetableEntry> {
  const response = await apiClient.get<TimetableEntry>(`/timetables/${id}`);
  return response.data;
}

export async function getTimetableTrainers(): Promise<TimetableTrainer[]> {
  const response = await apiClient.get<TimetableTrainer[]>("/timetables/trainers");
  return response.data;
}

export async function getAvailableUnits(
  sessionId: number
): Promise<TimetableUnit[]> {
  const response = await apiClient.get<TimetableUnit[]>(
    `/timetables/sessions/${sessionId}/available-units`
  );
  return response.data;
}

export async function createTimetableEntry(
  data: TimetableEntryPayload
): Promise<TimetableEntry> {
  const response = await apiClient.post<TimetableEntry>("/timetables", data);
  return response.data;
}

export async function updateTimetableEntry(
  id: number,
  data: Partial<TimetableEntryPayload>
): Promise<TimetableEntry> {
  const response = await apiClient.patch<TimetableEntry>(`/timetables/${id}`, data);
  return response.data;
}

export async function deleteTimetableEntry(id: number): Promise<void> {
  await apiClient.delete(`/timetables/${id}`);
}
