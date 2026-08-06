import axios from "axios";

import { clearSession, getAccessToken } from "@/lib/auth/session";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
});

// Attach the access token to every request. The token is read from storage so
// it stays available to the interceptor regardless of which module issued it.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 means the access token is missing, invalid, or expired. Clear the
// stored session so the app doesn't keep sending a dead token; individual
// callers decide what to do next (e.g. redirect to /login).
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearSession();
    }
    return Promise.reject(error);
  }
);
