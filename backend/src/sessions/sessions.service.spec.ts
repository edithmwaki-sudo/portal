import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

const prismaMock = {
  session: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const auditMock = { log: jest.fn() };

const user: AuthenticatedUser = {
  userId: 1,
  username: 'admin',
  email: 'a@x.test',
  roleId: 7,
  sessionUuid: 'current-session',
  permissions: [],
  mustResetPassword: false,
  twoFactorEnabled: false,
};

const req = { headers: {}, ip: '127.0.0.1' } as never;

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(SessionsService);
  });

  describe('listActiveForUser', () => {
    it('returns only active, unexpired sessions ordered by last use', async () => {
      prismaMock.session.findMany.mockResolvedValue([
        { id: 1, sessionUuid: 's1' },
      ]);
      const result = await service.listActiveForUser(1);
      expect(result).toHaveLength(1);
      expect(prismaMock.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { lastUsedAt: 'desc' },
      });
    });
  });

  describe('revokeOne', () => {
    it('revokes a session owned by the user', async () => {
      prismaMock.session.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        sessionUuid: 'other-session',
      });
      await service.revokeOne(user, 9, req);
      expect(prismaMock.session.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { revokedAt: expect.any(Date) },
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        'session.revoke',
        expect.any(Number),
        'Session',
        9,
        null,
        expect.anything(),
      );
    });

    it('throws 404 when the session does not exist', async () => {
      prismaMock.session.findUnique.mockResolvedValue(null);
      await expect(service.revokeOne(user, 404, req)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("forbids revoking another user's session", async () => {
      prismaMock.session.findUnique.mockResolvedValue({
        id: 9,
        userId: 999,
        sessionUuid: 'other-session',
      });
      await expect(service.revokeOne(user, 9, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('forbids revoking the current session via this endpoint', async () => {
      prismaMock.session.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        sessionUuid: 'current-session',
      });
      await expect(service.revokeOne(user, 9, req)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('revokeOthers', () => {
    it('revokes every other active session and keeps the current one', async () => {
      prismaMock.session.updateMany.mockResolvedValue({ count: 2 });
      const count = await service.revokeOthers(user, req);
      expect(count).toBe(2);
      expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          sessionUuid: { not: 'current-session' },
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
