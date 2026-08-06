import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// NOTE(studying): request-body capture into newValues is deferred — revisit later.
// import { getRequestContext } from '../common/request-context/request-context';
// import { redact } from '../common/request-context/redact';
import type { ClientInfo } from '../common/utils/request.util';

export interface AuditEntry {
  userId: number | null;
  action: string;
  entityType?: string | null;
  entityId?: string | number | null;
  oldValues?: unknown;
  newValues?: unknown;
  client?: ClientInfo | null;
  requestId?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/require-await -- no-op while audit logging is disabled
  async log(
    action: string,
    userId: number | null,
    entityType?: string | null,
    entityId?: string | number | null,
    values?: { oldValues?: unknown; newValues?: unknown } | null,
    client?: ClientInfo | null,
    requestId?: string | null,
  ): Promise<void> {
    // NOTE: audit logging is disabled for now — revisit later. Nothing is
    // written to audit_logs; the signature is kept so all call sites stay intact.
    void action;
    void userId;
    void entityType;
    void entityId;
    void values;
    void client;
    void requestId;
    return;

    // await this.prisma.auditLog.create({
    //   data: {
    //     userId,
    //     action,
    //     entityType: entityType ?? null,
    //     entityId: entityId != null ? String(entityId) : null,
    //     oldValues: (values?.oldValues as never) ?? null,
    //     newValues: (values?.newValues as never) ?? null,
    //     ipAddress: client?.ipAddress ?? null,
    //     userAgent: client?.userAgent ?? null,
    //     requestId: requestId ?? null,
    //   },
    // });
  }

  async findAll(
    page = 1,
    limit = 25,
    search?: string,
  ): Promise<{ items: unknown[]; total: number; page: number; limit: number }> {
    const where = search
      ? {
          OR: [
            { action: { contains: search, mode: 'insensitive' as const } },
            { entityType: { contains: search, mode: 'insensitive' as const } },
            { entityId: { contains: search } },
            { ipAddress: { contains: search } },
            {
              user: {
                is: {
                  OR: [
                    {
                      username: {
                        contains: search,
                        mode: 'insensitive' as const,
                      },
                    },
                    {
                      name: { contains: search, mode: 'insensitive' as const },
                    },
                  ],
                },
              },
            },
          ],
        }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
