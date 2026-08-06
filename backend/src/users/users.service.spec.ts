import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

jest.mock('../common/utils/crypto.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

interface PrismaUserMock {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
  findMany: jest.Mock;
}

interface PrismaMock {
  user: PrismaUserMock;
  session: { updateMany: jest.Mock };
  $transaction: jest.Mock;
}

const prismaMock: PrismaMock = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  session: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((input: unknown) => {
    // Support both the callback form (create) and the array form (list).
    if (typeof input === 'function') {
      return (input as (tx: PrismaMock) => unknown)(prismaMock);
    }
    return Array.isArray(input) ? Promise.all(input) : Promise.resolve(input);
  }),
};

const auditMock = { log: jest.fn() };

const createdUser = {
  id: 1,
  username: 'jdoe',
  email: 'jdoe@x.test',
  name: 'Jane Doe',
  status: 'ACTIVE',
  role: null,
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      username: 'jdoe',
      email: 'jdoe@x.test',
      password: 'password123',
      name: 'Jane Doe',
    };

    it('creates a user and writes an audit entry', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(createdUser);
      const result = await service.create(dto, 7);
      expect(result.id).toBe(1);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ username: 'jdoe' }) as Record<
            string,
            unknown
          >,
        }) as Record<string, unknown>,
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        'user.create',
        7,
        'User',
        1,
        expect.anything(),
      );
    });

    it('rejects a duplicate username or email', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 9,
        username: 'jdoe',
        email: 'jdoe@x.test',
      });
      await expect(service.create(dto, 7)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findOneById', () => {
    it('throws 404 for an unknown user', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      await expect(service.findOneById(404)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws 404 when updating an unknown user', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      const dto: UpdateUserDto = { name: 'New' };
      await expect(service.update(404, dto, 7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('updates and audits a known user', async () => {
      const existingUser = {
        id: 1,
        name: 'Old',
        role: null,
        username: 'jdoe',
        email: 'jdoe@x.test',
      };
      prismaMock.user.findFirst.mockResolvedValue(existingUser);
      prismaMock.user.update.mockResolvedValue({
        ...createdUser,
        name: 'New Name',
      });
      const result = await service.update(1, { name: 'New Name' }, 7);
      expect(result.name).toBe('New Name');
      expect(auditMock.log).toHaveBeenCalledWith(
        'user.update',
        7,
        'User',
        1,
        expect.anything(),
      );
    });
  });

  describe('resetPassword', () => {
    it('rehashes the password, forces reset, revokes sessions and audits', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        name: 'Jane',
        role: null,
        username: 'jdoe',
        email: 'x@x.test',
      });
      prismaMock.user.update.mockResolvedValue({
        ...createdUser,
        mustResetPassword: true,
      });
      prismaMock.session.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.resetPassword(
        1,
        { newPassword: 'new-secret-123' },
        7,
      );

      expect(result.mustResetPassword).toBe(true);
      expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        'user.password_reset',
        7,
        'User',
        1,
        expect.anything(),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes and audits', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        name: 'Jane',
        role: null,
        username: 'jdoe',
        email: 'x@x.test',
      });
      prismaMock.user.update.mockResolvedValue({});
      await service.remove(1, 7);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) as Date },
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        'user.delete',
        7,
        'User',
        1,
        expect.anything(),
      );
    });
  });

  describe('list', () => {
    it('returns paginated results with total', async () => {
      prismaMock.$transaction.mockResolvedValue([2, [createdUser]]);
      const result = await service.list(1, 25, 'jane');
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(1);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });
});
