import { apiClient } from "./client";

export interface AppLogEntry {
  id: number;
  time: string;
  level: string;
  message: string;
  context?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  [key: string]: unknown;
}

export interface LogsListResponse {
  items: AppLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export async function getAppLogs(
  page = 1,
  limit = 25,
  search?: string
): Promise<LogsListResponse> {
  const response = await apiClient.get<LogsListResponse>("/logs", {
    params: { page, limit, ...(search ? { search } : {}) },
  });
  return response.data;
}
