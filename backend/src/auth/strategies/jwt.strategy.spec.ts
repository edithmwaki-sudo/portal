import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import type { AccessTokenPayload } from './jwt.strategy';

function makePayload(
  overrides: Partial<AccessTokenPayload> = {},
): AccessTokenPayload {
  return {
    sub: 1,
    username: 'admin',
    email: 'admin@x.test',
    roleId: 7,
    sessionUuid: 'abc-123',
    permissions: ['roles.view'],
    mustResetPassword: false,
    twoFactorEnabled: false,
    type: 'access',
    ...overrides,
  };
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy({
      get: (key: string) =>
        key === 'JWT_ACCESS_SECRET' ? 'test-secret' : undefined,
    } as unknown as ConfigService);
  });

  it('maps a valid access-token payload to an AuthenticatedUser', () => {
    const user = strategy.validate(makePayload());
    expect(user).toEqual({
      userId: 1,
      username: 'admin',
      email: 'admin@x.test',
      roleId: 7,
      sessionUuid: 'abc-123',
      permissions: ['roles.view'],
      mustResetPassword: false,
      twoFactorEnabled: false,
    });
  });

  it('rejects tokens that are not access tokens', () => {
    expect(() => strategy.validate(makePayload({ type: 'refresh' }))).toThrow(
      UnauthorizedException,
    );
  });
});
