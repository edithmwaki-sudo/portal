import type { AuthUser } from "@/lib/api/auth";

const USER_KEY = "apex.user";

// The access token is intentionally kept in memory only (never localStorage):
// it is short-lived (10 min) and any XSS that can read memory can already act
// as the user. The refresh token is never exposed to JS at all — it lives in
// an httpOnly cookie set by the backend, so XSS cannot exfiltrate it.
let memoryAccessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

export function saveSession(session: {
  accessToken: string;
  user: AuthUser;
}): void {
  if (typeof window === "undefined") return;
  setAccessToken(session.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  setAccessToken(null);
  localStorage.removeItem(USER_KEY);
}
