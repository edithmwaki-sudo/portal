import { apiClient } from "./client";

export interface AuditUser {
  id: number;
  username: string;
  name: string;
}

export interface AuditEntry {
  id: number;
  userId: number | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
  user: AuditUser | null;
}

export interface AuditListResponse {
  items: AuditEntry[];
  total: number;
  page: number;
  limit: number;
}

export async function getAuditLogs(
  page = 1,
  limit = 25,
  search?: string
): Promise<AuditListResponse> {
  const response = await apiClient.get<AuditListResponse>("/audit", {
    params: { page, limit, ...(search ? { search } : {}) },
  });
  return response.data;
}
