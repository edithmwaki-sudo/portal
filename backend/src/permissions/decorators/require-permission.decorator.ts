import { SetMetadata } from '@nestjs/common';
import type { PermissionName } from '../permissions';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

/**
 * Declares the permission(s) required to access a handler, e.g.
 * `@RequirePermission(Permissions.canViewStudent)`.
 *
 * Enforcement happens in `PermissionsGuard` (registered as APP_GUARD).
 */
export const RequirePermission = (...permissions: PermissionName[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
