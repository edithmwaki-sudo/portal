import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashPassword } from '../common/utils/crypto.util';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const STUDENT_SELECT = {
  id: true,
  admissionNumber: true,
  courseId: true,
  level: true,
  admDate: true,
  status: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      name: true,
      gender: true,
      status: true,
      mustResetPassword: true,
      role: { select: { id: true, name: true, displayName: true } },
    },
  },
} satisfies Prisma.StudentProfileSelect;

const STUDENT_ROLE_NAME = 'student';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Legacy admission flow: create the user (role student, must reset) + student profile. */
  async create(dto: CreateStudentDto, actorId: number) {
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

    const admissionNumber =
      dto.admissionNumber ?? this.generateAdmissionNumber();
    const dupAdm = await this.prisma.studentProfile.findUnique({
      where: { admissionNumber },
      select: { id: true },
    });
    if (dupAdm) {
      throw new ConflictException(
        `Admission number '${admissionNumber}' is already in use`,
      );
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          password: await hashPassword(dto.password),
          name: dto.name,
          roleId: await this.ensureStudentRoleId(tx),
          phone: dto.phone,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          nationality: dto.nationality,
          county: dto.county,
          religion: dto.religion,
          alternativePhoneNumber: dto.alternativePhoneNumber,
          address: dto.address,
          city: dto.city,
          isPwd: dto.isPwd,
          disabilityType: dto.disabilityType,
          disabilityDescription: dto.disabilityDescription,
          mustResetPassword: true,
          twoFactorEnabled: false,
          status: 'ACTIVE',
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      return tx.studentProfile.create({
        data: {
          userId: user.id,
          admissionNumber,
          courseId: dto.courseId,
          level: dto.level ?? 1,
          admDate: dto.admDate ? new Date(dto.admDate) : new Date(),
          status: dto.status ?? 'ACTIVE',
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    });

    await this.audit.log('student.create', actorId, 'Student', profile.id, {
      newValues: { admissionNumber, username: dto.username },
    });

    return this.findOneById(profile.id);
  }

  async findAll(page = 1, limit = 25, search?: string) {
    const where: Prisma.StudentProfileWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { admissionNumber: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              {
                user: {
                  email: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentProfile.count({ where }),
      this.prisma.studentProfile.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: STUDENT_SELECT,
      }),
    ]);

    return { items, total, page, limit };
  }

  async findOneById(id: number) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id, deletedAt: null },
      select: STUDENT_SELECT,
    });
    if (!profile) {
      throw new NotFoundException(`Student with id '${id}' not found`);
    }
    return profile;
  }

  async update(id: number, dto: UpdateStudentDto, actorId: number) {
    const before = await this.findOneById(id);

    if (dto.admissionNumber !== undefined) {
      const dupAdm = await this.prisma.studentProfile.findUnique({
        where: { admissionNumber: dto.admissionNumber },
        select: { id: true },
      });
      if (dupAdm && dupAdm.id !== id) {
        throw new ConflictException(
          `Admission number '${dto.admissionNumber}' is already in use`,
        );
      }
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      if (dto.username !== undefined || dto.email !== undefined) {
        await tx.user.update({
          where: { id: before.user.id },
          data: {
            username: dto.username,
            email: dto.email,
            name: dto.name,
            phone: dto.phone,
            gender: dto.gender,
            updatedBy: actorId,
          },
        });
      }
      return tx.studentProfile.update({
        where: { id },
        data: {
          admissionNumber: dto.admissionNumber,
          courseId: dto.courseId,
          level: dto.level,
          admDate: dto.admDate ? new Date(dto.admDate) : undefined,
          status: dto.status,
          updatedBy: actorId,
        },
      });
    });

    await this.audit.log('student.update', actorId, 'Student', id, {
      oldValues: {
        admissionNumber: before.admissionNumber,
        status: before.status,
      },
      newValues: {
        admissionNumber: profile.admissionNumber,
        status: profile.status,
      },
    });

    return this.findOneById(id);
  }

  /** Soft delete the student profile + deactivate the linked user (legacy behavior). */
  async remove(id: number, actorId: number): Promise<void> {
    const profile = await this.findOneById(id);

    await this.prisma.$transaction([
      this.prisma.studentProfile.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: actorId },
      }),
      this.prisma.user.update({
        where: { id: profile.user.id },
        data: { status: 'INACTIVE', updatedBy: actorId },
      }),
    ]);

    await this.audit.log('student.delete', actorId, 'Student', id, {
      oldValues: { admissionNumber: profile.admissionNumber },
    });
  }

  private async ensureStudentRoleId(
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const role = await tx.role.findUnique({
      where: { name: STUDENT_ROLE_NAME },
      select: { id: true },
    });
    if (!role) {
      throw new ConflictException(
        `The '${STUDENT_ROLE_NAME}' role is not configured. Create it in Access > Roles first.`,
      );
    }
    return role.id;
  }

  private generateAdmissionNumber(): string {
    const seq = String(Math.floor(1000 + Math.random() * 9000));
    const yy = new Date().getFullYear().toString().slice(-2);
    return `STU/${seq}/${yy}`;
  }
}
