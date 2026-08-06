import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Gender, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashPassword } from '../common/utils/crypto.util';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import type { GenderOption } from './dto/create-staff.dto';

const STAFF_SELECT = {
  id: true,
  employeeNumber: true,
  nationalId: true,
  kraPin: true,
  nhifNumber: true,
  nssfNumber: true,
  departmentId: true,
  jobTitle: true,
  employmentType: true,
  dateJoined: true,
  contractEndDate: true,
  basicSalary: true,
  highestQualification: true,
  specialization: true,
  nextOfKinFirstName: true,
  nextOfKinLastName: true,
  nextOfKinPhone: true,
  nextOfKinAltPhone: true,
  nextOfKinEmail: true,
  nextOfKinRelationship: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      roleId: true,
      firstName: true,
      middleName: true,
      lastName: true,
      gender: true,
      dateOfBirth: true,
      nationality: true,
      placeOfBirth: true,
      religion: true,
      phone: true,
      alternativePhoneNumber: true,
      county: true,
      isPwd: true,
      disabilityType: true,
      disabilityDescription: true,
      status: true,
      role: { select: { id: true, name: true, displayName: true } },
    },
  },
  department: { select: { id: true, name: true, code: true } },
} satisfies Prisma.StaffProfileSelect;

const STAFF_LIST_SELECT = {
  id: true,
  employeeNumber: true,
  departmentId: true,
  jobTitle: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      roleId: true,
      firstName: true,
      middleName: true,
      lastName: true,
      status: true,
      role: { select: { id: true, name: true, displayName: true } },
    },
  },
  department: { select: { id: true, name: true, code: true } },
} satisfies Prisma.StaffProfileSelect;

type StaffRow = {
  id: number;
  employeeNumber: string | null;
  nationalId: string | null;
  kraPin: string | null;
  nhifNumber: string | null;
  nssfNumber: string | null;
  departmentId: number | null;
  jobTitle: string | null;
  employmentType: string | null;
  dateJoined: Date | null;
  contractEndDate: Date | null;
  basicSalary: Prisma.Decimal | null;
  highestQualification: string | null;
  specialization: string | null;
  nextOfKinFirstName: string | null;
  nextOfKinLastName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinAltPhone: string | null;
  nextOfKinEmail: string | null;
  nextOfKinRelationship: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    email: string;
    roleId: number | null;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    gender: Gender | null;
    dateOfBirth: Date | null;
    nationality: string | null;
    placeOfBirth: string | null;
    religion: string | null;
    phone: string | null;
    alternativePhoneNumber: string | null;
    county: string | null;
    isPwd: boolean;
    disabilityType: string | null;
    disabilityDescription: string | null;
    status: UserStatus;
    role: { id: number; name: string; displayName: string } | null;
  };
  department: { id: number; name: string; code: string } | null;
};

const DEFAULT_PASSWORD = 'password';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Legacy onboarding flow: create the user (default password, reset on first
   *  login) + staff profile, generating a sequential employee number. */
  async create(dto: CreateStaffDto, actorId: number) {
    const existingEmail = await this.prisma.user.findFirst({
      where: { deletedAt: null, email: dto.email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const roleId = await this.resolveRoleId(dto.role);

    const profile = await this.prisma.$transaction(async (tx) => {
      const employeeNumber = await this.buildNextEmployeeNumber(tx);

      const user = await tx.user.create({
        data: {
          username: employeeNumber,
          email: dto.email,
          password: await hashPassword(DEFAULT_PASSWORD),
          roleId,
          name: this.buildFullName(dto.firstName, dto.middleName, dto.lastName),
          firstName: dto.firstName,
          middleName: dto.middleName ?? null,
          lastName: dto.lastName,
          gender: this.toGender(dto.gender),
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          nationality: dto.nationality,
          placeOfBirth: dto.placeOfBirth,
          religion: dto.religion,
          phone: dto.phoneNumber,
          alternativePhoneNumber: dto.alternativePhoneNumber,
          county: dto.county,
          isPwd: dto.isPwd ?? false,
          disabilityType: dto.disabilityType,
          disabilityDescription: dto.disabilityDescription,
          mustResetPassword: true,
          twoFactorEnabled: false,
          status: dto.status === false ? 'INACTIVE' : 'ACTIVE',
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      return tx.staffProfile.create({
        data: {
          userId: user.id,
          employeeNumber,
          nationalId: dto.nationalId,
          kraPin: dto.kraPin,
          nhifNumber: dto.nhifNumber,
          nssfNumber: dto.nssfNumber,
          departmentId: dto.departmentId,
          jobTitle: dto.jobTitle,
          employmentType: dto.employmentType,
          dateJoined: dto.dateJoined ? new Date(dto.dateJoined) : new Date(),
          contractEndDate: dto.contractEndDate
            ? new Date(dto.contractEndDate)
            : undefined,
          basicSalary: dto.basicSalary,
          highestQualification: dto.highestQualification,
          specialization: dto.specialization,
          nextOfKinFirstName: dto.nextOfKinFirstName,
          nextOfKinLastName: dto.nextOfKinLastName,
          nextOfKinPhone: dto.nextOfKinPhone,
          nextOfKinAltPhone: dto.nextOfKinAltPhone,
          nextOfKinEmail: dto.nextOfKinEmail,
          nextOfKinRelationship: dto.nextOfKinRelationship,
          nextOfKinName: this.buildFullName(
            dto.nextOfKinFirstName,
            undefined,
            dto.nextOfKinLastName,
          ),
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    });

    await this.audit.log('staff.create', actorId, 'Staff', profile.id, {
      newValues: { employeeNumber: profile.employeeNumber, email: dto.email },
    });

    return this.findOneById(profile.id);
  }

  /** Meta for the onboarding form: next employee number + role/department lists. */
  async meta() {
    const [roles, departments] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true, displayName: true },
      }),
      this.prisma.department.findMany({
        where: { deletedAt: null },
        orderBy: { id: 'asc' },
        select: { id: true, name: true, code: true },
      }),
    ]);

    return {
      nextEmployeeNumber: await this.previewEmployeeNumber(),
      roles,
      departments,
    };
  }

  async findAll(page = 1, limit = 25, search?: string) {
    const where: Prisma.StaffProfileWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { employeeNumber: { contains: search, mode: 'insensitive' } },
              { jobTitle: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              {
                user: { firstName: { contains: search, mode: 'insensitive' } },
              },
              {
                user: { middleName: { contains: search, mode: 'insensitive' } },
              },
              { user: { lastName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.staffProfile.count({ where }),
      this.prisma.staffProfile.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: STAFF_LIST_SELECT,
      }),
    ]);

    return {
      items: rows.map((row) => this.serializeList(row)),
      total,
      page,
      limit,
    };
  }

  async findOneById(id: number) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { id, deletedAt: null },
      select: STAFF_SELECT,
    });
    if (!profile) {
      throw new NotFoundException(`Staff member with id '${id}' not found`);
    }
    return this.serialize(profile);
  }

  async update(id: number, dto: UpdateStaffDto, actorId: number) {
    const before = await this.findOneById(id);

    if (dto.email !== undefined && dto.email !== before.email) {
      const dup = await this.prisma.user.findFirst({
        where: {
          deletedAt: null,
          email: dto.email,
          NOT: { id: before.userId },
        },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    let roleId: number | undefined;
    if (dto.role !== undefined) {
      roleId = await this.resolveRoleId(dto.role);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: before.userId },
        data: {
          email: dto.email,
          roleId,
          firstName: dto.firstName,
          middleName: dto.middleName,
          lastName: dto.lastName,
          name:
            dto.firstName !== undefined || dto.lastName !== undefined
              ? this.buildFullName(
                  dto.firstName ?? before.firstName ?? '',
                  dto.middleName !== undefined
                    ? (dto.middleName ?? undefined)
                    : (before.middleName ?? undefined),
                  dto.lastName ?? before.lastName ?? '',
                )
              : undefined,
          gender:
            dto.gender !== undefined ? this.toGender(dto.gender) : undefined,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          nationality: dto.nationality,
          placeOfBirth: dto.placeOfBirth,
          religion: dto.religion,
          phone: dto.phoneNumber,
          alternativePhoneNumber: dto.alternativePhoneNumber,
          county: dto.county,
          isPwd: dto.isPwd,
          disabilityType: dto.disabilityType,
          disabilityDescription: dto.disabilityDescription,
          status:
            dto.status === undefined
              ? undefined
              : dto.status
                ? 'ACTIVE'
                : 'INACTIVE',
          updatedBy: actorId,
        },
      });

      await tx.staffProfile.update({
        where: { id },
        data: {
          nationalId: dto.nationalId,
          kraPin: dto.kraPin,
          nhifNumber: dto.nhifNumber,
          nssfNumber: dto.nssfNumber,
          departmentId: dto.departmentId,
          jobTitle: dto.jobTitle,
          employmentType: dto.employmentType,
          dateJoined: dto.dateJoined ? new Date(dto.dateJoined) : undefined,
          contractEndDate: dto.contractEndDate
            ? new Date(dto.contractEndDate)
            : undefined,
          basicSalary: dto.basicSalary,
          highestQualification: dto.highestQualification,
          specialization: dto.specialization,
          nextOfKinFirstName: dto.nextOfKinFirstName,
          nextOfKinLastName: dto.nextOfKinLastName,
          nextOfKinPhone: dto.nextOfKinPhone,
          nextOfKinAltPhone: dto.nextOfKinAltPhone,
          nextOfKinEmail: dto.nextOfKinEmail,
          nextOfKinRelationship: dto.nextOfKinRelationship,
          nextOfKinName:
            dto.nextOfKinFirstName !== undefined ||
            dto.nextOfKinLastName !== undefined
              ? this.buildFullName(
                  dto.nextOfKinFirstName ?? before.nextOfKinFirstName ?? '',
                  undefined,
                  dto.nextOfKinLastName ?? before.nextOfKinLastName ?? '',
                )
              : undefined,
          updatedBy: actorId,
        },
      });
    });

    await this.audit.log('staff.update', actorId, 'Staff', id, {
      oldValues: { employeeNumber: before.employeeNumber, email: before.email },
      newValues: { email: dto.email },
    });

    return this.findOneById(id);
  }

  /** Soft delete staff profile + deactivate the linked user. */
  async remove(id: number, actorId: number): Promise<void> {
    const profile = await this.findOneById(id);

    await this.prisma.$transaction([
      this.prisma.staffProfile.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: actorId },
      }),
      this.prisma.user.update({
        where: { id: profile.userId },
        data: { status: 'INACTIVE', updatedBy: actorId },
      }),
    ]);

    await this.audit.log('staff.delete', actorId, 'Staff', id, {
      oldValues: { employeeNumber: profile.employeeNumber },
    });
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async resolveRoleId(roleName: string): Promise<number> {
    const role = await this.prisma.role.findFirst({
      where: { name: { equals: roleName, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    if (!role) {
      throw new BadRequestException(`Role '${roleName}' does not exist`);
    }
    return role.id;
  }

  /**
   * Build a formatted employee number from the highest existing sequence.
   * e.g. "EMP/042/26". Runs inside the create transaction so concurrent
   * onboarding cannot collide on the unique employee_number column.
   */
  private async buildNextEmployeeNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const yy = new Date().getFullYear().toString().slice(-2);
    const rows = await tx.$queryRaw<{ maxSeq: number }[]>`
      SELECT COALESCE(
        MAX(CAST((regexp_match(employee_number, '^EMP/([0-9]{3})/[0-9]{2}$'))[1] AS int)),
        0
      )::int AS "maxSeq"
      FROM staff_profiles
      WHERE employee_number LIKE 'EMP/%'
    `;
    const maxSeq = rows[0]?.maxSeq ?? 0;
    return `EMP/${String(maxSeq + 1).padStart(3, '0')}/${yy}`;
  }

  private async previewEmployeeNumber(): Promise<string> {
    const yy = new Date().getFullYear().toString().slice(-2);
    const rows = await this.prisma.$queryRaw<{ maxSeq: number }[]>`
      SELECT COALESCE(
        MAX(CAST((regexp_match(employee_number, '^EMP/([0-9]{3})/[0-9]{2}$'))[1] AS int)),
        0
      )::int AS "maxSeq"
      FROM staff_profiles
      WHERE employee_number LIKE 'EMP/%'
    `;
    const maxSeq = rows[0]?.maxSeq ?? 0;
    return `EMP/${String(maxSeq + 1).padStart(3, '0')}/${yy}`;
  }

  private toGender(gender: GenderOption | undefined): Gender | undefined {
    if (!gender) return undefined;
    switch (gender) {
      case 'male':
        return Gender.MALE;
      case 'female':
        return Gender.FEMALE;
      default:
        return Gender.OTHER;
    }
  }

  private buildFullName(
    firstName?: string,
    middleName?: string,
    lastName?: string,
  ): string {
    return [firstName, middleName, lastName].filter(Boolean).join(' ');
  }

  private serializeList(row: {
    id: number;
    employeeNumber: string | null;
    departmentId: number | null;
    jobTitle: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: number;
      email: string;
      roleId: number | null;
      firstName: string | null;
      middleName: string | null;
      lastName: string | null;
      status: UserStatus;
      role: { id: number; name: string; displayName: string } | null;
    };
    department: { id: number; name: string; code: string } | null;
  }) {
    const u = row.user;
    const department = row.department;
    return {
      id: row.id,
      userId: u.id,
      email: u.email,
      roleId: u.roleId,
      roleName: u.role?.name ?? null,
      employeeNumber: row.employeeNumber,
      firstName: u.firstName,
      middleName: u.middleName,
      lastName: u.lastName,
      fullName:
        this.buildFullName(
          u.firstName ?? '',
          u.middleName ?? '',
          u.lastName ?? '',
        ) || null,
      departmentId: row.departmentId,
      departmentName: department?.name ?? null,
      departmentCode: department?.code ?? null,
      jobTitle: row.jobTitle,
      status: u.status === 'ACTIVE',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private serialize(row: StaffRow) {
    const u = row.user;
    const department = row.department;
    return {
      id: row.id,
      userId: u.id,
      email: u.email,
      roleId: u.roleId,
      roleName: u.role?.name ?? null,
      employeeNumber: row.employeeNumber,
      firstName: u.firstName,
      middleName: u.middleName,
      lastName: u.lastName,
      fullName:
        this.buildFullName(
          u.firstName ?? '',
          u.middleName ?? '',
          u.lastName ?? '',
        ) || null,
      gender: u.gender ? u.gender.toLowerCase() : null,
      dateOfBirth: u.dateOfBirth,
      nationality: u.nationality,
      nationalId: row.nationalId,
      placeOfBirth: u.placeOfBirth,
      religion: u.religion,
      phoneNumber: u.phone,
      alternativePhoneNumber: u.alternativePhoneNumber,
      county: u.county,
      departmentId: row.departmentId,
      departmentName: department?.name ?? null,
      departmentCode: department?.code ?? null,
      jobTitle: row.jobTitle,
      employmentType: row.employmentType,
      dateJoined: row.dateJoined,
      contractEndDate: row.contractEndDate,
      kraPin: row.kraPin,
      nhifNumber: row.nhifNumber,
      nssfNumber: row.nssfNumber,
      highestQualification: row.highestQualification,
      specialization: row.specialization,
      isPwd: u.isPwd,
      disabilityType: u.disabilityType,
      disabilityDescription: u.disabilityDescription,
      nextOfKinFirstName: row.nextOfKinFirstName,
      nextOfKinLastName: row.nextOfKinLastName,
      nextOfKinPhone: row.nextOfKinPhone,
      nextOfKinAltPhone: row.nextOfKinAltPhone,
      nextOfKinEmail: row.nextOfKinEmail,
      nextOfKinRelationship: row.nextOfKinRelationship,
      status: u.status === 'ACTIVE',
      basicSalary: row.basicSalary ? row.basicSalary.toNumber() : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
