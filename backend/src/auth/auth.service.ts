import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { User } from '@prisma/client';import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { OtpService } from '../otp/otp.service';
import {
  hashPassword,
  hashToken,
  randomToken,
  verifyPassword,
  verifyTokenHash,
} from '../common/utils/crypto.util';
import { getClientInfo } from '../common/utils/request.util';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import type { AccessTokenPayload } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

type UserWithRole = User & {
  role: {
    id: number;
    name: string;
    displayName: string;
    rolePermissions: { permission: { name: string } }[];
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
  ) {}

  // =========================================================
  // LOGIN
  // =========================================================
  async login(dto: LoginDto, req: Request) {
    const client = getClientInfo(req);
    const { usernameOrEmail, password } = dto;

    const user =
      await this.usersService.findAuthUserByUsernameOrEmail(usernameOrEmail);

    if (!user || user.deletedAt) {
      await this.recordAttempt(
        null,
        usernameOrEmail,
        false,
        client,
        'invalid_credentials',
      );
      throw new UnauthorizedException('Invalid username/email or password');
    }

    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      await this.recordAttempt(
        user.id,
        user.username,
        false,
        client,
        user.status.toLowerCase(),
      );
      throw new ForbiddenException(
        'Account is not active. Contact the administrator.',
      );
    }

    if (
      user.status === 'LOCKED' &&
      user.lockedUntil &&
      user.lockedUntil > new Date()
    ) {
      await this.recordAttempt(
        user.id,
        user.username,
        false,
        client,
        'account_locked',
      );
      throw new ForbiddenException(
        `Account is locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) {
      await this.handleFailedAttempt(user, client);
      throw new UnauthorizedException('Invalid username/email or password');
    }

    // Reset failure state on success.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: user.status === 'LOCKED' ? 'ACTIVE' : user.status,
        lastLoginAt: new Date(),
        lastLoginIp: client.ipAddress,
        lastLoginUserAgent: client.userAgent,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });

    await this.recordAttempt(user.id, user.username, true, client, null);

    // 2FA gate: no tokens issued until the OTP is verified.
    if (user.twoFactorEnabled) {
      return this.otp.requestLoginChallenge(user.id);
    }

    const tokens = await this.issueTokens(
      user,
      client,
      dto.rememberMe ?? false,
    );
    await this.audit.log('auth.login', user.id, null, null, null, client);
    return tokens;
  }

  // =========================================================
  // REFRESH (rotation + session validation)
  // =========================================================
  async refresh(rawRefreshToken: string, req: Request) {
    const client = getClientInfo(req);
    const payload = await this.verifyRefreshToken(rawRefreshToken);

    const session = await this.prisma.session.findUnique({
      where: { sessionUuid: payload.sessionUuid },
    });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has expired');
    }
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid session');
    }

    const user = await this.usersService.findAuthUserByUsernameOrEmailById(
      payload.sub,
    );
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw new ForbiddenException('Account is not active');
    }

    // Rotation + replay protection: token must match the stored hash for this session.
    const matches = verifyTokenHash(rawRefreshToken, session.refreshTokenHash);
    if (!matches) {
      // Reuse of an old refresh token — revoke the session.
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const tokens = await this.rotateSessionTokens(user, session.id, client);
    await this.audit.log('auth.refresh', user.id, null, null, null, client);
    return tokens;
  }

  // =========================================================
  // LOGOUT
  // =========================================================
  async logout(currentUser: AuthenticatedUser, req: Request) {
    const client = getClientInfo(req);
    await this.prisma.session.updateMany({
      where: { sessionUuid: currentUser.sessionUuid, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log(
      'auth.logout',
      currentUser.userId,
      null,
      null,
      null,
      client,
    );
  }

  // =========================================================
  // 2FA COMPLETION
  // =========================================================
  async completeOtpLogin(userId: number, req: Request) {
    const client = getClientInfo(req);
    const user =
      await this.usersService.findAuthUserByUsernameOrEmailById(userId);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User no longer exists');
    }
    const tokens = await this.issueTokens(user, client, true);
    await this.audit.log('auth.login_2fa', user.id, null, null, null, client);
    return tokens;
  }

  // =========================================================
  // ME / PASSWORD CHANGE
  // =========================================================
  async me(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException(`User with id '${userId}' not found`);
    }
    const { role, ...profile } = user;
    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      phone: profile.phone,
      name: profile.name,
      gender: profile.gender,
      status: profile.status,
      mustResetPassword: profile.mustResetPassword,
      twoFactorEnabled: profile.twoFactorEnabled,
      emailVerifiedAt: profile.emailVerifiedAt,
      lastLoginAt: profile.lastLoginAt,
      createdAt: profile.createdAt,
      role: role
        ? { id: role.id, name: role.name, displayName: role.displayName }
        : null,
      permissions: this.permissionNames(user),
    };
  }

  async changePassword(
    currentUser: AuthenticatedUser,
    dto: ChangePasswordDto,
    req: Request,
  ) {
    const client = getClientInfo(req);
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.userId },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const ok = await verifyPassword(dto.currentPassword, user.password);
    if (!ok) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(dto.newPassword),
        passwordChangedAt: new Date(),
        mustResetPassword: false,
      },
    });

    // Revoke every other session; keep the current one alive.
    await this.prisma.session.updateMany({
      where: {
        userId: user.id,
        sessionUuid: { not: currentUser.sessionUuid },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await this.audit.log(
      'auth.password_change',
      user.id,
      null,
      null,
      null,
      client,
    );
  }

  // =========================================================
  // TOKEN HELPERS
  // =========================================================
  private async issueTokens(
    user: UserWithRole,
    client: {
      ipAddress: string | null;
      userAgent: string | null;
      browser: string | null;
      operatingSystem: string | null;
      deviceName: string | null;
    },
    rememberMe: boolean,
  ) {
    const sessionUuid = randomUUID();
    const accessToken = this.signAccessToken(user, sessionUuid);
    const { raw, hash } = await this.buildRefreshToken(user.id, sessionUuid);

    const ttlMinutes = rememberMe
      ? this.int('JWT_REFRESH_EXPIRES_IN_MINUTES', 30 * 24 * 60)
      : this.int('SHORT_SESSION_MINUTES', 12 * 60);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          sessionUuid,
          userId: user.id,
          refreshTokenHash: hash,
          expiresAt,
          lastUsedAt: new Date(),
          ipAddress: client.ipAddress,
          browser: client.browser,
          operatingSystem: client.operatingSystem,
          deviceName: client.deviceName,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: hash },
      }),
    ]);

    return {
      requiresTwoFactor: false,
      accessToken,
      refreshToken: raw,
      expiresIn: this.accessTtlSeconds(),
      user: await this.usersService.findOneById(user.id),
    };
  }

  private async rotateSessionTokens(
    user: UserWithRole,
    sessionId: number,
    client: {
      ipAddress: string | null;
      userAgent: string | null;
      browser: string | null;
      operatingSystem: string | null;
      deviceName: string | null;
    },
  ) {
    const sessionUuid = await this.prisma.session
      .findUnique({ where: { id: sessionId } })
      .then((s) => s!.sessionUuid);
    const accessToken = this.signAccessToken(user, sessionUuid);
    const { raw, hash } = await this.buildRefreshToken(user.id, sessionUuid);

    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: {
          refreshTokenHash: hash,
          lastUsedAt: new Date(),
          expiresAt: new Date(
            Date.now() +
              this.int('JWT_REFRESH_EXPIRES_IN_MINUTES', 30 * 24 * 60) * 60_000,
          ),
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: hash },
      }),
    ]);

    return {
      requiresTwoFactor: false,
      accessToken,
      refreshToken: raw,
      expiresIn: this.accessTtlSeconds(),
      user: await this.usersService.findOneById(user.id),
    };
  }

  private signAccessToken(user: UserWithRole, sessionUuid: string): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      sessionUuid,
      permissions: this.permissionNames(user),
      mustResetPassword: user.mustResetPassword,
      twoFactorEnabled: user.twoFactorEnabled,
      type: 'access',
    };
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessTtlSeconds(),
    });
  }

  private async buildRefreshToken(userId: number, sessionUuid: string) {
    const raw = this.jwtService.sign(
      { sub: userId, sessionUuid, type: 'refresh', jti: randomToken(24) },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.refreshTtlSeconds(),
      },
    );
    const hash = hashToken(raw);
    return { raw, hash };
  }

  private async verifyRefreshToken(raw: string) {
    try {
      const payload = (await this.jwtService.verifyAsync(raw, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      })) as { sub: number; sessionUuid: string; type: string };
      if (payload.type !== 'refresh' || !payload.sessionUuid) {
        throw new Error('not a refresh token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private permissionNames(user: UserWithRole): string[] {
    return user.role?.rolePermissions.map((rp) => rp.permission.name) ?? [];
  }

  private async handleFailedAttempt(
    user: User,
    client: { ipAddress: string | null; userAgent: string | null },
  ) {
    const maxAttempts = this.int('MAX_FAILED_LOGIN_ATTEMPTS', 5);
    const newCount = user.failedLoginAttempts + 1;
    const shouldLock = newCount >= maxAttempts;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newCount,
        lastFailedLoginAt: new Date(),
        lockedUntil: shouldLock
          ? new Date(
              Date.now() +
                this.int('ACCOUNT_LOCK_DURATION_MINUTES', 15) * 60_000,
            )
          : user.lockedUntil,
        status: shouldLock ? 'LOCKED' : user.status,
      },
    });

    await this.recordAttempt(
      user.id,
      user.username,
      false,
      client,
      shouldLock ? 'locked' : 'invalid_credentials',
    );
  }

  private async recordAttempt(
    userId: number | null,
    username: string,
    successful: boolean,
    client: { ipAddress: string | null; userAgent: string | null },
    failureReason: string | null,
  ) {
    await this.prisma.loginAttempt.create({
      data: {
        userId,
        username,
        successful,
        ipAddress: client.ipAddress,
        userAgent: client.userAgent,
        failureReason,
      },
    });
  }

  private int(key: string, fallback: number): number {
    const value = this.config.get<string>(key);
    return value ? parseInt(value, 10) : fallback;
  }

  private accessTtlSeconds(): number {
    return this.ttlSeconds('JWT_ACCESS_EXPIRES_IN', 20 * 60);
  }

  private refreshTtlSeconds(): number {
    return this.ttlSeconds('JWT_REFRESH_EXPIRES_IN', 30 * 24 * 60 * 60);
  }

  private ttlSeconds(key: string, fallback: number): number {
    const raw = this.config.get<string>(key);
    if (!raw) return fallback;
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) return fallback;
    const num = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return fallback;
    }
  }
}
