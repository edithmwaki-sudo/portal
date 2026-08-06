import {
  Permissions,
  PERMISSION_DESCRIPTIONS,
  type PermissionName,
} from '../../permissions/permissions';

export type PermissionSeed = {
  name: string;
  description: string;
};

/**
 * Seed list derived from the app-wide `Permissions` constants file — the
 * single source of truth. Do NOT maintain a separate list here; add a
 * permission by editing `src/permissions/permissions.ts`.
 *
 * `sync-permissions.ts` reconciles the `permissions` table against this list
 * on every boot (insert missing, sync descriptions, prune extras). Permissions
 * are immutable via the API.
 */
export const SEED_PERMISSIONS: PermissionSeed[] = (
  Object.values(Permissions) as PermissionName[]
).map((name) => ({
  name,
  description: PERMISSION_DESCRIPTIONS[name],
}));
