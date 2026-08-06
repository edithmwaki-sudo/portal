import axios from "axios";

import { clearSession, getAccessToken, setAccessToken } from "@/lib/auth/session";
import { refreshToken } from "@/lib/api/auth";

type RetryableConfig = import("axios").InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Attach the access token to every request. The token is read from memory so
// it stays available to the interceptor regardless of which module issued it.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, try a single silent refresh (refresh token lives in the httpOnly
// cookie, invisible to JS) and replay the original request. If refresh fails,
// the session is over — clear local state and let the caller redirect.
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise<string | null>((resolve) => {
      pendingQueue.push(resolve);
    });
  }

  isRefreshing = true;
  try {
    const session = await refreshToken();
    setAccessToken(session.accessToken);
    pendingQueue.forEach((resolve) => resolve(session.accessToken));
    pendingQueue = [];
    return session.accessToken;
  } catch {
    pendingQueue.forEach((resolve) => resolve(null));
    pendingQueue = [];
    clearSession();
    return null;
  } finally {
    isRefreshing = false;
  }
}

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/verify-otp")
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config &&
      !(error.config as RetryableConfig)._retry &&
      !isAuthEndpoint(error.config.url)
    ) {
      const original = error.config as RetryableConfig;
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  }
);
