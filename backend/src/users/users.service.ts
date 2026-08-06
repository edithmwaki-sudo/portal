import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashPassword } from '../common/utils/crypto.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  phone: true,
  name: true,
  gender: true,
  status: true,
  mustResetPassword: true,
  twoFactorEnabled: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, name: true, displayName: true } },
} satisfies Prisma.UserSelect;
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Full record used by the auth layer (includes credentials). Never expose directly. */
  async findAuthUserByUsernameOrEmailById(id: number) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });
  }

  /** Full record used by the auth layer (includes credentials). Never expose directly. */
  async findAuthUserByUsernameOrEmail(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { username: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });
  }

  async create(dto: CreateUserDto, actorId: number) {
    const existing = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ username: dto.username }, { email: dto.email }],
      },
      select: { id: true, username: true, email: true },
    });

    if (existing) {
      throw new ConflictException(
        existing.username === dto.username
          ? 'A user with this username already exists'
          : 'A user with this email already exists',
      );
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          password: await hashPassword(dto.password),
          name: dto.name,
          roleId: dto.roleId,
          phone: dto.phone,
          gender: dto.gender,
          mustResetPassword: dto.mustResetPassword ?? false,
          twoFactorEnabled: dto.twoFactorEnabled ?? false,
          status: dto.status,
          createdBy: actorId,
          updatedBy: actorId,
          ...(dto.type === 'staff'
            ? {
                staffProfile: {
                  create: { createdBy: actorId, updatedBy: actorId },
                },
              }
            : dto.type === 'student'
              ? {
                  studentProfile: {
                    create: { createdBy: actorId, updatedBy: actorId },
                  },
                }
              : {}),
        },
        select: PUBLIC_USER_SELECT,
      });

      return created;
    });

    await this.audit.log('user.create', actorId, 'User', user.id, {
      newValues: { username: user.username, email: user.email },
    });

    return user;
  }

  async findOneById(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`);
    }

    return user;
  }

  async update(id: number, dto: UpdateUserDto, actorId: number) {
    const before = await this.findOneById(id);

    if (dto.username !== undefined) {
      const conflict = await this.prisma.user.findFirst({
        where: { deletedAt: null, username: dto.username, NOT: { id } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('A user with this username already exists');
      }
    }

    if (dto.email !== undefined) {
      const conflict = await this.prisma.user.findFirst({
        where: { deletedAt: null, email: dto.email, NOT: { id } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { id },
        data: {
          username: dto.username,
          email: dto.email,
          name: dto.name,
          roleId: dto.roleId,
          phone: dto.phone,
          gender: dto.gender,
          status: dto.status,
          mustResetPassword: dto.mustResetPassword,
          updatedBy: actorId,
        },
        select: PUBLIC_USER_SELECT,
      });

      if (record.status !== 'ACTIVE') {
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return record;
    });

    await this.audit.log('user.update', actorId, 'User', id, {
      oldValues: {
        username: before.username,
        email: before.email,
        name: before.name,
        roleId: before.role?.id ?? null,
        status: before.status,
      },
      newValues: {
        username: updated.username,
        email: updated.email,
        name: updated.name,
        roleId: updated.role?.id ?? null,
        status: updated.status,
      },
    });

    return updated;
  }

  /** Admin password reset — new password + force reset on next login + revoke active sessions. */
  async resetPassword(id: number, dto: ResetUserPasswordDto, actorId: number) {
    await this.findOneById(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { id },
        data: {
          password: await hashPassword(dto.newPassword),
          mustResetPassword: true,
          updatedBy: actorId,
        },
        select: PUBLIC_USER_SELECT,
      });

      await tx.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return record;
    });

    await this.audit.log('user.password_reset', actorId, 'User', id, {
      newValues: { username: updated.username, mustResetPassword: true },
    });

    return updated;
  }

  /** Soft delete — keeps history/audit integrity. Revokes all sessions immediately. */
  async remove(id: number, actorId: number): Promise<void> {
    const user = await this.findOneById(id);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit.log('user.delete', actorId, 'User', id, {
      oldValues: { username: user.username, email: user.email },
    });
  }

  async list(
    page = 1,
    limit = 25,
    search?: string,
    type?: 'staff' | 'student',
  ) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(type
        ? type === 'staff'
          ? { staffProfile: { isNot: null } }
          : { studentProfile: { isNot: null } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: PUBLIC_USER_SELECT,
      }),
    ]);

    return { items, total, page, limit };
  }
}
