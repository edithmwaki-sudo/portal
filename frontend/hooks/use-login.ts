"use client"

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { login, verifyOtp, type AuthSession } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import { useAuth } from "@/lib/auth/auth-context";
import type { LoginValues, OtpValues } from "@/schemas/login-schema";

export type LoginStep = "credentials" | "otp";

const FALLBACK = "Something went wrong. Please try again.";

function errorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;
  if (err.response) {
    const status = err.response.status;
    const message: unknown = err.response.data?.message;
    if (status === 429) {
      return "Too many attempts. Please try again later.";
    }
    if (
      status === 403 &&
      typeof message === "string" &&
      message.startsWith("Account is locked until")
    ) {
      const iso = message.slice("Account is locked until ".length);
      const date = new Date(iso);
      if (!Number.isNaN(date.getTime())) {
        return `Account is locked until ${date.toLocaleString()}.`;
      }
      return "Account is locked. Please try again later.";
    }
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
    return fallback;
  }
  if (err.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }
  return "Network error. Please check your connection and try again.";
}

/**
 * Orchestrates the multi-step login flow. Keeps the credentials -> OTP
 * transition, token storage, and post-login redirect out of the form
 * component so the UI stays purely presentational.
 */
export function useLogin() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loginToken, setLoginToken] = useState<string | null>(null);

  const finish = useCallback(
    async (session: AuthSession) => {
      saveSession(session);
      await refresh();
      router.push("/");
    },
    [refresh, router]
  );

  const submitCredentials = useCallback(
    async (values: LoginValues) => {
      setIsSubmitting(true);
      setServerError(null);
      try {
        const result = await login(values);
        if (result.requiresTwoFactor) {
          setLoginToken(result.loginToken);
          setStep("otp");
          return;
        }
        finish(result);
      } catch (err) {
        setServerError(errorMessage(err, FALLBACK));
      } finally {
        setIsSubmitting(false);
      }
    },
    [finish]
  );

  const submitOtp = useCallback(
    async (values: OtpValues) => {
      if (!loginToken) return;
      setIsSubmitting(true);
      setServerError(null);
      try {
        const session = await verifyOtp(loginToken, values.code);
        finish(session);
      } catch (err) {
        setServerError(
          errorMessage(err, "Unable to verify the code. Please try again.")
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [loginToken, finish]
  );

  const goBack = useCallback(() => {
    setStep("credentials");
    setLoginToken(null);
    setServerError(null);
  }, []);

  return {
    step,
    isSubmitting,
    serverError,
    submitCredentials,
    submitOtp,
    goBack,
    clearServerError: () => setServerError(null),
  };
}
