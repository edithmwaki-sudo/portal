import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import type { PermissionName } from '../permissions';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

/**
 * Enforces `@RequirePermission(...)` metadata on routes.
 *
 * Semantics: OR — a user holding ANY of the required permissions is allowed
 * (e.g. `@RequirePermission(Permissions.canManageCertification)`
 * passes if the user holds either one).
 *
 * Permission names are read from the authenticated user attached to the
 * request by `JwtAuthGuard` (they are embedded in the access token — no DB
 * query per request). Missing the required permission returns 403.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionName[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const allowed = required.some((permission) =>
      user.permissions.includes(permission),
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
