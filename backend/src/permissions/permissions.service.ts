import { Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { syncPermissions } from '../database/seed/sync-permissions';

@Injectable()
export class PermissionsService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await syncPermissions(this.prisma);
  }

  async sync(actorId?: number) {
    await syncPermissions(this.prisma);
    const result = await this.findAll(1, 100);
    if (actorId) {
      await this.audit.log(
        'permission.sync',
        actorId,
        'Permission',
        null,
        { newValues: { total: result.total } },
      );
    }
    return result;
  }

  async findAll(page = 1, limit = 25) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.permission.count(),
      this.prisma.permission.findMany({
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total, page, limit };
  }

  async findOneByName(name: string) {
    const row = await this.prisma.permission.findUnique({
      where: { name },
    });

    if (!row) {
      throw new NotFoundException(`Permission '${name}' not found`);
    }

    return row;
  }
}