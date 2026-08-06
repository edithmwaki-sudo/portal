import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Gender, UserStatus } from '@prisma/client';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStaffDto } from './dto/create-staff.dto';

jest.mock('../common/utils/crypto.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

interface PrismaMock {
  user: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  role: { findFirst: jest.Mock };
  staffProfile: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
  department: { findMany: jest.Mock };
  $transaction: jest.Mock;
}

const prismaMock: PrismaMock = {
  user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  role: { findFirst: jest.fn() },
  staffProfile: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  department: { findMany: jest.fn() },
  $transaction: jest.fn((input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: PrismaMock) => unknown)(prismaMock);
    }
    return Array.isArray(input) ? Promise.all(input) : Promise.resolve(input);
  }),
};

const auditMock = { log: jest.fn() };

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    employeeNumber: 'EMP/001/26',
    nationalId: '12345678',
    kraPin: 'KRA001001',
    nhifNumber: 'NHIF001001',
    nssfNumber: 'NSSF001001',
    departmentId: 2,
    jobTitle: 'Lecturer',
    employmentType: 'Permanent',
    dateJoined: new Date('2026-01-01'),
    contractEndDate: null,
    basicSalary: { toNumber: () => 250000 },
    highestQualification: 'Degree',
    specialization: 'Software Engineering',
    nextOfKinFirstName: 'Jane',
    nextOfKinLastName: 'Doe',
    nextOfKinPhone: '+254723456789',
    nextOfKinAltPhone: '+254733456789',
    nextOfKinEmail: 'jane.doe@email.com',
    nextOfKinRelationship: 'Partner',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: {
      id: 10,
      email: 'a@x.test',
      roleId: 3,
      firstName: 'John',
      middleName: 'Michael',
      lastName: 'Doe',
      gender: Gender.MALE,
      dateOfBirth: new Date('1990-05-10'),
      nationality: 'Kenyan',
      placeOfBirth: 'Nairobi',
      religion: 'Christianity',
      phone: '+254712345678',
      alternativePhoneNumber: '+254798765432',
      county: 'Nairobi',
      isPwd: false,
      disabilityType: null,
      disabilityDescription: null,
      status: UserStatus.ACTIVE,
      role: { id: 3, name: 'trainer', displayName: 'Trainer' },
    },
    department: { id: 2, name: 'ICT', code: 'ICT' },
    ...overrides,
  };
}

function validDto(): CreateStaffDto {
  return {
    email: 'a@x.test',
    role: 'trainer',
    firstName: 'John',
    middleName: 'Michael',
    lastName: 'Doe',
    gender: 'male',
    dateOfBirth: '1990-05-10',
    nationality: 'Kenyan',
    nationalId: '12345678',
    placeOfBirth: 'Nairobi',
    religion: 'Christianity',
    phoneNumber: '+254712345678',
    alternativePhoneNumber: '+254798765432',
    county: 'Nairobi',
    departmentId: 2,
    jobTitle: 'Lecturer',
    employmentType: 'Permanent',
    dateJoined: '2026-01-01',
    basicSalary: 250000,
    status: true,
    kraPin: 'KRA001001',
    nhifNumber: 'NHIF001001',
    nssfNumber: 'NSSF001001',
    highestQualification: 'Degree',
    specialization: 'Software Engineering',
    isPwd: false,
    nextOfKinFirstName: 'Jane',
    nextOfKinLastName: 'Doe',
    nextOfKinPhone: '+254723456789',
    nextOfKinAltPhone: '+254733456789',
    nextOfKinEmail: 'jane.doe@email.com',
    nextOfKinRelationship: 'Partner',
  };
}

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get(StaffService);
  });

  describe('create', () => {
    it('rejects a duplicate email', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 9 });
      const dto = validDto();
      await expect(service.create(dto, 7)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('creates the user + staff profile and audits', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.role.findFirst.mockResolvedValue({ id: 3, name: 'trainer' });
      prismaMock.staffProfile.findMany.mockResolvedValue([]);
      prismaMock.user.create.mockResolvedValue({ id: 10 });
      prismaMock.staffProfile.create.mockResolvedValue({ id: 1 });
      prismaMock.staffProfile.findFirst.mockResolvedValue(buildRow());

      const result = await service.create(validDto(), 7);

      expect(result.id).toBe(1);
      const userData = prismaMock.user.create.mock.calls[0]?.[0] as {
        data?: { username?: string };
      };
      expect(userData.data).toMatchObject({
        username: 'EMP/001/26',
        email: 'a@x.test',
        password: 'hashed-password',
        roleId: 3,
        mustResetPassword: true,
      });
      const staffData = prismaMock.staffProfile.create.mock.calls[0]?.[0] as {
        data?: { employeeNumber?: string; departmentId?: number };
      };
      expect(staffData.data).toMatchObject({
        employeeNumber: 'EMP/001/26',
        departmentId: 2,
        jobTitle: 'Lecturer',
        employmentType: 'Permanent',
      });
      expect(auditMock.log).toHaveBeenCalledWith(
        'staff.create',
        7,
        'Staff',
        1,
        expect.anything(),
      );
    });
  });

  describe('findOneById', () => {
    it('throws 404 for an unknown staff member', async () => {
      prismaMock.staffProfile.findFirst.mockResolvedValue(null);
      await expect(service.findOneById(404)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('serializes a staff member', async () => {
      prismaMock.staffProfile.findFirst.mockResolvedValue(buildRow());
      const result = await service.findOneById(1);
      expect(result).toMatchObject({
        id: 1,
        email: 'a@x.test',
        fullName: 'John Michael Doe',
        employeeNumber: 'EMP/001/26',
        gender: 'male',
        status: true,
      });
    });
  });
});
