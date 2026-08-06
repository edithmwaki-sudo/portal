import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { OtpService } from '../otp/otp.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { Request } from 'express';

jest.mock('../common/utils/crypto.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed'),
  hashToken: jest.fn(() => 'token-hash'),
  verifyPassword: jest.fn().mockResolvedValue(true),
  verifyTokenHash: jest.fn(() => true),
  randomToken: jest.fn(() => 'rand-123'),
}));
import * as cryptoUtil from '../common/utils/crypto.util';

const verifyPasswordMock = cryptoUtil.verifyPassword as jest.Mock;
const verifyTokenHashMock = cryptoUtil.verifyTokenHash as jest.Mock;

const baseUser = {
  id: 1,
  username: 'admin',
  email: 'admin@x.test',
  password: 'hashed',
  roleId: 7,
  status: 'ACTIVE',
  deletedAt: null,
  failedLoginAttempts: 0,
  lastFailedLoginAt: null,
  lockedUntil: null,
  mustResetPassword: false,
  twoFactorEnabled: false,
  emailVerifiedAt: null,
  role: {
    id: 7,
    name: 'administrator',
    displayName: 'Administrator',
    rolePermissions: [{ permission: { name: 'roles.view' } }],
  },
};

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  session: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  loginAttempt: { create: jest.fn() },
  $transaction: jest.fn(),
};

const usersServiceMock = {
  findAuthUserByUsernameOrEmail: jest.fn(),
  findAuthUserByUsernameOrEmailById: jest.fn(),
  findOneById: jest.fn().mockResolvedValue({ id: 1, username: 'admin' }),
};

const jwtMock = {
  sign: jest.fn(() => 'signed-token'),
  verifyAsync: jest.fn(),
};

const configValues: Record<string, string> = {
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_ACCESS_EXPIRES_IN: '20m',
  JWT_REFRESH_EXPIRES_IN: '30d',
  JWT_REFRESH_EXPIRES_IN_MINUTES: '43200',
  SHORT_SESSION_MINUTES: '720',
  MAX_FAILED_LOGIN_ATTEMPTS: '5',
  ACCOUNT_LOCK_DURATION_MINUTES: '15',
};
const configMock = {
  get: jest.fn((key: string) => configValues[key] ?? undefined),
};

const auditMock = { log: jest.fn() };
const otpMock = { requestLoginChallenge: jest.fn() };

const req = { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as Request;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.assign(jwtMock, { sign: jest.fn(() => 'signed-token') });
    verifyPasswordMock.mockResolvedValue(true);
    verifyTokenHashMock.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
        { provide: AuditService, useValue: auditMock },
        { provide: OtpService, useValue: otpMock },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    const dto: LoginDto = { usernameOrEmail: 'admin', password: 'password123' };

    it('logs in a valid user and issues tokens', async () => {
      usersServiceMock.findAuthUserByUsernameOrEmail.mockResolvedValue(
        baseUser,
      );
      prismaMock.$transaction.mockResolvedValue([{ id: 1 }]);
      const result = await service.login(dto, req);
      expect(result.requiresTwoFactor).toBe(false);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginAttempts: 0 }),
        }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        'auth.login',
        1,
        null,
        null,
        null,
        expect.anything(),
      );
    });

    it('rejects an unknown user without revealing that the account exists', async () => {
      usersServiceMock.findAuthUserByUsernameOrEmail.mockResolvedValue(null);
      await expect(service.login(dto, req)).rejects.toThrow(
        'Invalid username/email or password',
      );
      expect(prismaMock.loginAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ successful: false }),
        }),
      );
    });

    it('rejects a soft-deleted user', async () => {
      usersServiceMock.findAuthUserByUsernameOrEmail.mockResolvedValue({
        ...baseUser,
        deletedAt: new Date(),
      });
      await expect(service.login(dto, req)).rejects.toThrow(
        'Invalid username/email or password',
      );
    });

    it('rejects an inactive or suspended account', async () => {
      for (const status of ['INACTIVE', 'SUSPENDED']) {
        usersServiceMock.findAuthUserByUsernameOrEmail.mockResolvedValue({
          ...baseUser,
          status,
        });
        await expect(service.login(dto, req)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
      }
    });

    it('rejects a locked account while the lock is active', async () => {
      usersServiceMock.findAuthUserByUsernameOrEmail.mockResolvedValue({
        ...baseUser,
        status: 'LOCKED',
        lockedUntil: new Date(Date.now() + 60_000),
      });
      await expect(service.login(dto, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('increments failed attempts and locks the account at the threshold', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      usersServiceMock.findAuthUserByUsernameOrEmail.mockResolvedValue({
        ...baseUser,
        failedLoginAttempts: 4,
      });
      prismaMock.user.update.mockResolvedValue({});

      await expect(service.login(dto, req)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          status: 'LOCKED',
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it('returns a 2FA challenge instead of tokens when two-factor is enabled', async () => {
      usersServiceMock.findAuthUserByUsernameOrEmail.mockResolvedValue({
        ...baseUser,
        twoFactorEnabled: true,
      });
      otpMock.requestLoginChallenge.mockResolvedValue({
        requiresTwoFactor: true,
        loginToken: 'challenge',
      });
      const result = await service.login(dto, req);
      expect(result).toEqual({
        requiresTwoFactor: true,
        loginToken: 'challenge',
      });
      expect(otpMock.requestLoginChallenge).toHaveBeenCalledWith(1);
      expect(jwtMock.sign).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const refreshToken = 'refresh.raw';

    beforeEach(() => {
      jwtMock.verifyAsync.mockResolvedValue({
        sub: 1,
        sessionUuid: 'session-1',
        type: 'refresh',
      });
      prismaMock.session.findUnique.mockResolvedValue({
        id: 1,
        sessionUuid: 'session-1',
        userId: 1,
        refreshTokenHash: 'token-hash',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      usersServiceMock.findAuthUserByUsernameOrEmailById.mockResolvedValue(
        baseUser,
      );
      prismaMock.$transaction.mockResolvedValue([{ id: 1 }]);
    });

    it('rotates tokens and updates the stored hash on success', async () => {
      const result = await service.refresh(refreshToken, req);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prismaMock.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refreshTokenHash: expect.any(String),
          }),
        }),
      );
    });

    it('rejects a revoked session', async () => {
      prismaMock.session.findUnique.mockResolvedValue({
        id: 1,
        sessionUuid: 'session-1',
        userId: 1,
        refreshTokenHash: 'token-hash',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(service.refresh(refreshToken, req)).rejects.toThrow(
        'Session has been revoked',
      );
    });

    it('rejects an expired session', async () => {
      prismaMock.session.findUnique.mockResolvedValue({
        id: 1,
        sessionUuid: 'session-1',
        userId: 1,
        refreshTokenHash: 'token-hash',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh(refreshToken, req)).rejects.toThrow(
        'Session has expired',
      );
    });

    it('rejects a mismatched session owner', async () => {
      prismaMock.session.findUnique.mockResolvedValue({
        id: 1,
        sessionUuid: 'session-1',
        userId: 999,
        refreshTokenHash: 'token-hash',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(service.refresh(refreshToken, req)).rejects.toThrow(
        'Invalid session',
      );
    });

    it('detects refresh-token reuse, revokes the session, and refuses', async () => {
      verifyTokenHashMock.mockReturnValue(false);
      await expect(service.refresh(refreshToken, req)).rejects.toThrow(
        'Refresh token reuse detected',
      );
      expect(prismaMock.session.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('logout', () => {
    it('revokes the current session and logs the action', async () => {
      prismaMock.session.updateMany.mockResolvedValue({ count: 1 });
      await service.logout(
        {
          userId: 1,
          username: 'admin',
          email: 'a@x.test',
          roleId: 7,
          sessionUuid: 'session-1',
          permissions: [],
          mustResetPassword: false,
          twoFactorEnabled: false,
        },
        req,
      );
      expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
        where: { sessionUuid: 'session-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        'auth.logout',
        1,
        null,
        null,
        null,
        expect.anything(),
      );
    });
  });

  describe('changePassword', () => {
    const currentUser = {
      userId: 1,
      username: 'admin',
      email: 'a@x.test',
      roleId: 7,
      sessionUuid: 'current',
      permissions: [],
      mustResetPassword: false,
      twoFactorEnabled: false,
    };
    const dto: ChangePasswordDto = {
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
    };

    it('rejects a wrong current password', async () => {
      verifyPasswordMock.mockResolvedValue(false);
      prismaMock.user.findUnique.mockResolvedValue({
        ...baseUser,
        password: 'hashed',
      });
      await expect(
        service.changePassword(currentUser, dto, req),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates the password and revokes every other session', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...baseUser,
        password: 'hashed',
      });
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.session.updateMany.mockResolvedValue({ count: 3 });
      await service.changePassword(currentUser, dto, req);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          password: 'hashed',
          mustResetPassword: false,
          passwordChangedAt: expect.any(Date),
        }),
      });
      expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          sessionUuid: { not: 'current' },
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
