import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { getClientInfo } from '../common/utils/request.util';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { SessionResponseDto } from './dto/session-response.dto';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Active (non-revoked, non-expired) sessions belonging to the current user. */
  async listActiveForUser(userId: number): Promise<SessionResponseDto[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((s) => SessionResponseDto.from(s));
  }

  /** Revoke a single session, but only if it belongs to the current user. */
  async revokeOne(
    user: AuthenticatedUser,
    sessionId: number,
    req: Request,
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.userId !== user.userId) {
      throw new ForbiddenException('You cannot revoke another user\'s session');
    }
    if (session.sessionUuid === user.sessionUuid) {
      throw new ForbiddenException('Revoke your current session via logout instead');
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.log(
      'session.revoke',
      user.userId,
      'Session',
      session.id,
      null,
      getClientInfo(req),
    );
  }

  /** Revoke every other active session, keeping the current one alive. */
  async revokeOthers(user: AuthenticatedUser, req: Request): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId: user.userId,
        sessionUuid: { not: user.sessionUuid },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    await this.audit.log(
      'session.revoke_all',
      user.userId,
      null,
      null,
      null,
      getClientInfo(req),
    );
    return result.count;
  }
}