import { apiClient } from "./client";

export interface CalendarEventType {
  id: number;
  code: string;
  label: string;
  colorHex: string;
}

export interface CalendarEvent {
  id: number;
  academicYearId: number;
  academicSessionId: number;
  eventTypeId: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  source: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  eventType: CalendarEventType;
}

export interface CalendarWeekend {
  date: string;
  day: number;
  type: string;
}

export interface SessionCalendar {
  session: {
    id: number;
    name: string;
    startDate: string | null;
    endDate: string | null;
  };
  weekends: CalendarWeekend[];
  events: CalendarEvent[];
}

export interface YearCalendar {
  year: {
    id: number;
    name: string;
    startDate: string | null;
    endDate: string | null;
  };
  sessions: { id: number; code: string; name: string }[];
  weekends: CalendarWeekend[];
  events: CalendarEvent[];
}

export async function getEventTypes(): Promise<CalendarEventType[]> {
  const response = await apiClient.get<CalendarEventType[]>("/calendar/event-types");
  return response.data;
}

export async function getSessionCalendar(
  sessionId: number
): Promise<SessionCalendar> {
  const response = await apiClient.get<SessionCalendar>(
    `/academic-sessions/${sessionId}/calendar`
  );
  return response.data;
}

export async function getYearCalendar(yearId: number): Promise<YearCalendar> {
  const response = await apiClient.get<YearCalendar>(
    `/academic-years/${yearId}/calendar`
  );
  return response.data;
}

export interface CalendarEventPayload {
  eventTypeId: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isLocked?: boolean;
}

export async function createCalendarEvent(
  sessionId: number,
  data: CalendarEventPayload
): Promise<CalendarEvent> {
  const response = await apiClient.post<CalendarEvent>(
    `/academic-sessions/${sessionId}/calendar/events`,
    data
  );
  return response.data;
}

export async function updateCalendarEvent(
  sessionId: number,
  eventId: number,
  data: Partial<CalendarEventPayload>
): Promise<CalendarEvent> {
  const response = await apiClient.put<CalendarEvent>(
    `/academic-sessions/${sessionId}/calendar/events/${eventId}`,
    data
  );
  return response.data;
}

export async function deleteCalendarEvent(
  sessionId: number,
  eventId: number
): Promise<void> {
  await apiClient.delete(
    `/academic-sessions/${sessionId}/calendar/events/${eventId}`
  );
}

export async function generateCalendar(sessionId: number): Promise<{
  synced: number;
  note?: string;
}> {
  const response = await apiClient.post(
    `/academic-sessions/${sessionId}/calendar/generate`
  );
  return response.data;
}

export async function syncCalendarHolidays(sessionId: number): Promise<{
  synced: number;
}> {
  const response = await apiClient.post(
    `/academic-sessions/${sessionId}/calendar/sync-holidays`
  );
  return response.data;
}
