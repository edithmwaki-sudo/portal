"use client"

import { useAuth } from "@/lib/auth/auth-context";

/**
 * Exposes the signed-in user (with permissions) from the global auth context.
 * `loading` is true until the initial /auth/me resolves (or the session is
 * confirmed absent), so pages/sidebar can gate on permission lists.
 */
export function useCurrentUser() {
  const { user, loading } = useAuth();
  return { user, loading };
}

export function usePermissions() {
  const { user, loading } = useAuth();
  return { permissions: user?.permissions ?? [], loading };
}

export function hasAnyPermission(
  permissions: string[],
  required?: string[]
): boolean {
  if (!required || required.length === 0) return true;
  return required.some((permission) => permissions.includes(permission));
}