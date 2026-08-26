import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoleDto } from './dto/create-role.dto';

const prismaMock = {
  role: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  rolePermission: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  permission: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

const auditMock = { log: jest.fn() };

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(RolesService);
  });

  describe('create', () => {
    it('normalizes the name, creates the role, and audits', async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);
      prismaMock.role.create.mockResolvedValue({
        id: 1,
        name: 'school_admin',
        displayName: 'School Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const dto: CreateRoleDto = {
        name: ' School Admin ',
        displayName: 'School Admin',
      };
      const role = await service.create(dto, 7);
      expect(role.name).toBe('school_admin');
      expect(prismaMock.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'school_admin' }),
        }),
      );
      expect(auditMock.log).toHaveBeenCalledWith(
        'role.create',
        7,
        'Role',
        1,
        expect.anything(),
      );
    });

    it('rejects a duplicate role name', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 2 });
      await expect(
        service.create({ name: 'administrator' }, 7),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOneById', () => {
    it('throws 404 for an unknown role', async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);
      await expect(service.findOneById(404)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('attachPermission', () => {
    it('rejects an unknown permission', async () => {
      prismaMock.role.findUnique.mockResolvedValue({
        id: 1,
        name: 'admin',
        displayName: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [],
      });
      prismaMock.rolePermission.findMany.mockResolvedValue([]);
      prismaMock.permission.findUnique.mockResolvedValue(null);
      await expect(
        service.attachPermission(1, 'nope.view', 7),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a permission already attached', async () => {
      prismaMock.role.findUnique.mockResolvedValue({
        id: 1,
        name: 'admin',
        displayName: 'Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [],
      });
      prismaMock.rolePermission.findMany.mockResolvedValue([]);
      prismaMock.permission.findUnique.mockResolvedValue({
        id: 3,
        name: 'roles.view',
      });
      prismaMock.rolePermission.findUnique.mockResolvedValue({
        roleId: 1,
        permissionId: 3,
      });
      await expect(
        service.attachPermission(1, 'roles.view', 7),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
