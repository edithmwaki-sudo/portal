import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

type RoleWithPermissions = {
  id: number;
  name: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
  permissions: { id: number; name: string; description: string | null }[];
};

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateRoleDto, actorId: number) {
    const normalizedName = this.normalizeName(dto.name);

    const existing = await this.prisma.role.findUnique({
      where: { name: normalizedName },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`A role named '${normalizedName}' already exists`);
    }

    const row = await this.prisma.role.create({
      data: {
        name: normalizedName,
        displayName: dto.displayName ?? normalizedName,
      },
    });

    await this.audit.log(
      'role.create',
      actorId,
      'Role',
      row.id,
      { newValues: { name: row.name, displayName: row.displayName } },
    );

    return this.toRoleWithPermissions({ ...row, permissions: [] });
  }

  async findAll(page = 1, limit = 25, search?: string) {
    const where: Prisma.RoleWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const items = await Promise.all(rows.map((r) => this.loadPermissions(r)));

    return { items, total, page, limit };
  }

  async findOneById(id: number): Promise<RoleWithPermissions> {
    const row = await this.prisma.role.findUnique({ where: { id } });

    if (!row) {
      throw new NotFoundException(`Role with id '${id}' not found`);
    }

    return this.loadPermissions(row);
  }

  async update(id: number, dto: UpdateRoleDto, actorId: number) {
    const row = await this.findOneById(id);
    const normalizedName =
      dto.name !== undefined ? this.normalizeName(dto.name) : undefined;

    if (normalizedName !== undefined && normalizedName !== row.name) {
      const existing = await this.prisma.role.findUnique({
        where: { name: normalizedName },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException(
          `A role named '${normalizedName}' already exists`,
        );
      }
    }

    const updated = await this.prisma.role.update({
      where: { id: row.id },
      data: {
        name: normalizedName,
        displayName: dto.displayName,
      },
    });

    await this.audit.log(
      'role.update',
      actorId,
      'Role',
      row.id,
      {
        oldValues: { name: row.name, displayName: row.displayName },
        newValues: { name: updated.name, displayName: updated.displayName },
      },
    );

    return this.loadPermissions(updated);
  }

  async remove(id: number, actorId: number): Promise<void> {
    const row = await this.findOneById(id);
    await this.prisma.role.delete({ where: { id } });
    await this.audit.log(
      'role.delete',
      actorId,
      'Role',
      id,
      { oldValues: { name: row.name, displayName: row.displayName } },
    );
  }

  async attachPermission(
    roleId: number,
    permissionName: string,
    actorId: number,
  ) {
    const role = await this.findOneById(roleId);

    const permission = await this.prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      throw new NotFoundException(`Permission '${permissionName}' not found`);
    }

    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: permission.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Permission '${permissionName}' is already attached to role '${role.id}'`,
      );
    }

    await this.prisma.rolePermission.create({
      data: { roleId, permissionId: permission.id },
    });

    await this.audit.log(
      'role.permission_attach',
      actorId,
      'RolePermission',
      `${roleId}:${permission.id}`,
      { newValues: { roleId, permissionName: permission.name } },
    );

    return this.loadPermissions(role);
  }

  async detachPermission(
    roleId: number,
    permissionName: string,
    actorId: number,
  ) {
    await this.findOneById(roleId);

    const permission = await this.prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      throw new NotFoundException(`Permission '${permissionName}' not found`);
    }

    await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId: permission.id },
    });

    await this.audit.log(
      'role.permission_detach',
      actorId,
      'RolePermission',
      `${roleId}:${permission.id}`,
      { oldValues: { roleId, permissionName: permission.name } },
    );
  }

  async listPermissions(roleId: number) {
    const role = await this.findOneById(roleId);
    return role.permissions;
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private async loadPermissions(
    role: { id: number; name: string; displayName: string; createdAt: Date; updatedAt: Date },
  ): Promise<RoleWithPermissions> {
    const attached = await this.prisma.rolePermission.findMany({
      where: { roleId: role.id },
      include: { permission: true },
      orderBy: { permission: { id: 'asc' } },
    });

    return this.toRoleWithPermissions({
      ...role,
      permissions: attached.map((a) => a.permission),
    });
  }

  private toRoleWithPermissions(role: RoleWithPermissions): RoleWithPermissions {
    return role;
  }
}