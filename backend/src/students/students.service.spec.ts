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
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  courseCurriculum: { findFirst: jest.Mock };
  courseEnrolment: {
    count: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  course: { findFirst: jest.Mock };
  academicYear: { findFirst: jest.Mock };
  academicSession: { findFirst: jest.Mock };
  role: { findUnique: jest.Mock };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
}

const prismaMock: PrismaMock = {
  user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  studentProfile: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  courseCurriculum: { findFirst: jest.fn() },
  courseEnrolment: {
    count: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  course: { findFirst: jest.fn() },
  academicYear: { findFirst: jest.fn() },
  academicSession: { findFirst: jest.fn() },
  role: { findUnique: jest.fn() },
  $queryRaw: jest.fn().mockResolvedValue([]),
  $transaction: jest.fn((input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: PrismaMock) => unknown)(prismaMock);
    }
    return Array.isArray(input) ? Promise.all(input) : Promise.resolve(input);
  }),
};

const auditMock = { log: jest.fn() };

const fullRow = {
  id: 1,
  admissionNumber: 'ICT/0001/26',
  nationalId: null,
  courseId: 1,
  level: 1,
  admDate: new Date('2026-01-05'),
  status: 'ACTIVE',
  nextOfKinFirstName: null,
  nextOfKinLastName: null,
  nextOfKinPhone: null,
  nextOfKinAltPhone: null,
  nextOfKinEmail: null,
  nextOfKinRelationship: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  courseEnrolments: [],
  user: {
    id: 10,
    username: 'ICT/0001/26',
    email: 'j@x.test',
    phone: '0712345678',
    name: 'Jane Doe',
    firstName: 'Jane',
    middleName: null,
    lastName: 'Doe',
    gender: null,
    dateOfBirth: null,
    nationality: null,
    placeOfBirth: null,
    religion: null,
    county: null,
    alternativePhoneNumber: null,
    address: null,
    city: null,
    postalCode: null,
    isPwd: false,
    disabilityType: null,
    disabilityDescription: null,
    mustResetPassword: true,
    status: 'ACTIVE',
    role: null,
  },
};

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
    it('rejects a duplicate email', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 9 });
      const dto: CreateStudentDto = {
        email: 'jane@x.test',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '0712345678',
        courseCurriculumId: 3,
      };
      await expect(service.create(dto, 7)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('creates user + profile + enrolment with a sequential admission number', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.academicSession.findFirst.mockResolvedValue({ id: 5 });
      prismaMock.courseCurriculum.findFirst.mockResolvedValue({
        id: 3,
        isActive: true,
        course: { id: 1, initials: 'ICT', code: 'ICT-001', name: 'ICT' },
      });
      prismaMock.course.findFirst.mockResolvedValue({
        initials: 'ICT',
        code: 'ICT-001',
      });
      prismaMock.academicYear.findFirst.mockResolvedValue({
        startDate: new Date('2026-01-01'),
      });
      prismaMock.courseEnrolment.count.mockResolvedValue(0);
      prismaMock.role.findUnique.mockResolvedValue({ id: 4 });
      prismaMock.user.create.mockResolvedValue({ id: 10 });
      prismaMock.studentProfile.create.mockResolvedValue({ id: 1 });
      prismaMock.courseEnrolment.create.mockResolvedValue({ id: 9 });
      prismaMock.studentProfile.findFirst.mockResolvedValue(fullRow);

      const dto: CreateStudentDto = {
        email: 'jane@x.test',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '0712345678',
        courseCurriculumId: 3,
      };
      const result = await service.create(dto, 7);

      expect(result.admissionNumber).toBe('ICT/0001/26');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const createCall = prismaMock.user.create.mock.calls[0]?.[0] as
        | {
            data?: {
              username?: string;
              password?: string;
              mustResetPassword?: boolean;
            };
          }
        | undefined;
      expect(createCall?.data).toMatchObject({
        username: 'ICT/0001/26',
        password: 'hashed-password',
        mustResetPassword: true,
      });
      expect(prismaMock.courseEnrolment.create).toHaveBeenCalled();
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
      prismaMock.$transaction.mockResolvedValue([1, [fullRow]]);
      const result = await service.findAll(1, 25);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].admissionNumber).toBe('ICT/0001/26');
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

  describe('nextAdmissionNumber', () => {
    it('computes the next sequential admission number', async () => {
      prismaMock.course.findFirst.mockResolvedValue({
        id: 1,
        name: 'ICT',
        initials: 'ICT',
        code: 'ICT-001',
      });
      prismaMock.academicYear.findFirst.mockResolvedValue({
        startDate: new Date('2026-01-01'),
      });
      prismaMock.courseEnrolment.count.mockResolvedValue(12);
      const result = await service.nextAdmissionNumber(1);
      expect(result.nextAdmissionNumber).toBe('ICT/0013/26');
    });
  });
});
