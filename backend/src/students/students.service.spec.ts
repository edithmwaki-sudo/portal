import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStudentDto } from './dto/create-student.dto';

jest.mock('../common/utils/crypto.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

interface PrismaMock {
  user: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  studentProfile: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
  role: { findUnique: jest.Mock };
  $transaction: jest.Mock;
}

const prismaMock: PrismaMock = {
  user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  studentProfile: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  role: { findUnique: jest.fn() },
  $transaction: jest.fn((input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: PrismaMock) => unknown)(prismaMock);
    }
    return Array.isArray(input) ? Promise.all(input) : Promise.resolve(input);
  }),
};

const auditMock = { log: jest.fn() };

describe('StudentsService', () => {
  let service: StudentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(StudentsService);
  });

  describe('create', () => {
    it('rejects a duplicate username or email', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 9,
        username: 'jdoe',
        email: 'jdoe@x.test',
      });
      const dto: CreateStudentDto = {
        username: 'jdoe',
        email: 'jdoe@x.test',
        password: 'password123',
        name: 'Jane Doe',
      };
      await expect(service.create(dto, 7)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('creates the user + student profile and audits', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.studentProfile.findUnique.mockResolvedValue(null);
      prismaMock.role.findUnique.mockResolvedValue({ id: 4 });
      prismaMock.user.create.mockResolvedValue({ id: 10 });
      prismaMock.studentProfile.create.mockResolvedValue({ id: 1 });
      prismaMock.studentProfile.findFirst.mockResolvedValue({
        id: 1,
        admissionNumber: 'STU/0001/26',
        user: { id: 10, username: 'STU/0001/26', email: 'j@x.test' },
      });

      const dto: CreateStudentDto = {
        username: 'STU/0001/26',
        email: 'j@x.test',
        password: 'password123',
        name: 'Jane Doe',
      };
      const result = await service.create(dto, 7);
      expect(result.id).toBe(1);
      expect(prismaMock.user.create).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const studentCreate = prismaMock.studentProfile.create.mock.calls[0]?.[0];
      expect(studentCreate).toBeDefined();
      expect(
        (studentCreate as { data?: { status?: string } }).data,
      ).toMatchObject({ status: 'ACTIVE' });
      expect(auditMock.log).toHaveBeenCalledWith(
        'student.create',
        7,
        'Student',
        1,
        expect.anything(),
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated results', async () => {
      prismaMock.$transaction.mockResolvedValue([1, [{ id: 1 }]]);
      const result = await service.findAll(1, 25);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOneById', () => {
    it('throws 404 for an unknown student', async () => {
      prismaMock.studentProfile.findFirst.mockResolvedValue(null);
      await expect(service.findOneById(404)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
