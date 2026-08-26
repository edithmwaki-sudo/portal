import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

function makeContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => (() => {}),
    getClass: () => (() => {}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

const reflectorMock = {
  getAllAndOverride: jest.fn(),
};

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new PermissionsGuard(reflectorMock as unknown as Reflector);
  });

  it('allows when no permission is required', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows a user holding any of the required permissions (OR semantics)', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([
      'staff.view',
      'roles.view',
    ]);
    const user: AuthenticatedUser = {
      userId: 1,
      username: 'admin',
      email: 'a@x.test',
      roleId: 7,
      sessionUuid: 's',
      permissions: ['roles.view'],
      mustResetPassword: false,
      twoFactorEnabled: false,
    };
    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it('throws 403 when the user lacks every required permission', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['roles.create']);
    const user: AuthenticatedUser = {
      userId: 1,
      username: 'staff',
      email: 's@x.test',
      roleId: 8,
      sessionUuid: 's',
      permissions: ['staff.view'],
      mustResetPassword: false,
      twoFactorEnabled: false,
    };
    expect(() => guard.canActivate(makeContext(user))).toThrow(
      ForbiddenException,
    );
  });

  it('throws 403 when no authenticated user is attached', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['roles.view']);
    expect(() => guard.canActivate(makeContext())).toThrow(
      'Authentication required',
    );
  });

  it('reads metadata from both handler and class', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(['roles.view']);
    const user: AuthenticatedUser = {
      userId: 1,
      username: 'u',
      email: 'u@x.test',
      roleId: 7,
      sessionUuid: 's',
      permissions: ['roles.view'],
      mustResetPassword: false,
      twoFactorEnabled: false,
    };
    guard.canActivate(makeContext(user));
    expect(reflectorMock.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRE_PERMISSIONS_KEY,
      [expect.any(Function), expect.any(Function)],
    );
  });
});
