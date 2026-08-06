import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export interface AccessTokenPayload {
  sub: number;
  username: string;
  email: string;
  roleId: number | null;
  sessionUuid: string;
  permissions: string[];
  mustResetPassword: boolean;
  twoFactorEnabled: boolean;
  type: 'access';
}

function cookieExtractor(req: Request): string | null {
  const token =
    req?.cookies?.['access_token'] ?? req?.headers?.['authorization']?.split(' ')[1] ?? null;
  return token || null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      roleId: payload.roleId,
      sessionUuid: payload.sessionUuid,
      permissions: payload.permissions,
      mustResetPassword: payload.mustResetPassword,
      twoFactorEnabled: payload.twoFactorEnabled,
    };
  }
}