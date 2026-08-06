import { apiClient } from "./client";
import type { LoginValues } from "@/schemas/login-schema";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  name: string;
  gender: string | null;
  status: string;
  role: { id: number; name: string; displayName: string } | null;
  permissions: string[];
  mustResetPassword: boolean;
  twoFactorEnabled: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthSession {
  requiresTwoFactor: false;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  loginToken: string;
}

export type LoginResponse = AuthSession | TwoFactorChallenge;

export async function login(values: LoginValues): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", values);
  return response.data;
}

export async function verifyOtp(
  loginToken: string,
  code: string
): Promise<AuthSession> {
  const response = await apiClient.post<AuthSession>("/auth/verify-otp", {
    loginToken,
    code,
  });
  return response.data;
}

export async function refreshToken(refreshToken: string): Promise<AuthSession> {
  const response = await apiClient.post<AuthSession>("/auth/refresh", {
    refreshToken,
  });
  return response.data;
}

export async function getMe(): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>("/auth/me");
  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
