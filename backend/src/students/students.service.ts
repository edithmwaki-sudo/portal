import {
  BadRequestException,
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

export interface StudentFilters {
  search?: string;
  status?: string;
  courseId?: number;
  curriculumId?: number;
  level?: number;
  /** Restrict to the profile owned by this user id (self-service scoping). */
  userId?: number;
}

const STUDENT_INCLUDE = {
  user: {
    include: {
      role: { select: { id: true, name: true, displayName: true } },
    },
  },
  courseEnrolments: {
    where: { deletedAt: null },
    orderBy: { id: 'desc' },
    take: 1,
    include: {
      courseCurriculum: {
        include: {
          course: {
            include: { authority: true, level: true, department: true },
          },
          curriculum: true,
        },
      },
      academicSession: { include: { year: true } },
      academicYear: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.StudentProfileInclude;

const STUDENT_ROLE_NAME = 'student';
const MAX_EXPORT_ROWS = 5000;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Admit a student: user account + profile + course enrolment in one transaction. */
  async create(dto: CreateStudentDto, actorId: number) {
    const existingUser = await this.prisma.user.findFirst({
      where: { deletedAt: null, email: dto.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const activeSession = await this.prisma.academicSession.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { id: true, academicYearId: true },
    });
    const activeYear = await this.prisma.academicYear.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });
    const enrolmentYearId =
      activeSession?.academicYearId ?? activeYear?.id ?? null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const { studentId, admissionNumber } = await this.prisma.$transaction(
          async (tx) => {
            const course = await tx.course.findFirst({
              where: { id: dto.courseId, deletedAt: null, isActive: true },
              select: {
                id: true,
                initials: true,
                code: true,
                name: true,
                certificationAuthorityId: true,
              },
            });
            if (!course) {
              throw new BadRequestException(
                'Selected course does not exist or is inactive',
              );
            }
            if (
              dto.authorityId != null &&
              course.certificationAuthorityId !== dto.authorityId
            ) {
              throw new BadRequestException(
                'Selected course does not belong to the selected certification authority',
              );
            }

            const cc = await tx.courseCurriculum.findFirst({
              where: { courseId: course.id, isActive: true },
              include: {
                course: {
                  select: {
                    id: true,
                    initials: true,
                    code: true,
                    name: true,
                  },
                },
              },
            });
            if (!cc) {
              throw new BadRequestException(
                'No active curriculum is currently open for this course',
              );
            }

            // Row lock serializes concurrent admissions for the same course so
            // the sequential admission number stays race-safe.
            await tx.$queryRaw`SELECT id FROM course_curricula WHERE id = ${cc.id} FOR UPDATE`;

            const nextNumber = await this.buildAdmissionNumber(
              tx,
              cc.course.id,
            );
            const fullName =
              [dto.firstName, dto.middleName, dto.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || dto.lastName;

            const user = await tx.user.create({
              data: {
                username: nextNumber,
                email: dto.email,
                password: await hashPassword(dto.phone),
                name: fullName,
                firstName: dto.firstName,
                middleName: dto.middleName ?? null,
                lastName: dto.lastName,
                roleId: await this.ensureStudentRoleId(tx),
                phone: dto.phone,
                gender: dto.gender,
                dateOfBirth: dto.dateOfBirth
                  ? new Date(dto.dateOfBirth)
                  : undefined,
                nationality: dto.nationality,
                county: dto.county,
                placeOfBirth: dto.placeOfBirth,
                religion: dto.religion,
                address: dto.address,
                city: dto.city,
                postalCode: dto.postalCode,
                alternativePhoneNumber: dto.alternativePhoneNumber,
                isPwd: dto.isPwd ?? false,
                disabilityType: dto.disabilityType,
                disabilityDescription: dto.disabilityDescription,
                mustResetPassword: true,
                twoFactorEnabled: false,
                status: 'ACTIVE',
                createdBy: actorId,
                updatedBy: actorId,
              },
            });

            const admDate = dto.admDate ? new Date(dto.admDate) : new Date();
            const profile = await tx.studentProfile.create({
              data: {
                userId: user.id,
                admissionNumber: nextNumber,
                nationalId: dto.nationalId,
                courseId: cc.course.id,
                level: dto.level ?? 1,
                admDate,
                status: 'ACTIVE',
                nextOfKinFirstName: dto.nextOfKinFirstName,
                nextOfKinLastName: dto.nextOfKinLastName,
                nextOfKinPhone: dto.nextOfKinPhone,
                nextOfKinAltPhone: dto.nextOfKinAltPhone,
                nextOfKinEmail: dto.nextOfKinEmail,
                nextOfKinRelationship: dto.nextOfKinRelationship,
                createdBy: actorId,
                updatedBy: actorId,
              },
            });

            await tx.courseEnrolment.create({
              data: {
                studentId: profile.id,
                courseCurriculumId: cc.id,
                academicSessionId: activeSession?.id ?? null,
                academicYearId: enrolmentYearId,
                enrolmentDate: admDate,
                entryLevel: dto.level ?? 1,
                status: 'ENROLLED',
                createdBy: actorId,
                updatedBy: actorId,
              },
            });

            return {
              studentId: profile.id,
              admissionNumber: nextNumber,
            };
          },
        );

        await this.audit.log('student.create', actorId, 'Student', studentId, {
          newValues: { admissionNumber, email: dto.email },
        });

        return this.findOneById(studentId);
      } catch (err) {
        // A concurrent admit raced our admission number; regenerate and retry.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          continue;
        }
        throw err;
      }
    }

    throw new ConflictException(
      'Could not generate a unique admission number. Please try again.',
    );
  }

  async findAll(page = 1, limit = 25, filters: StudentFilters = {}) {
    const where = this.buildWhere(filters);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.studentProfile.count({ where }),
      this.prisma.studentProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: STUDENT_INCLUDE,
      }),
    ]);

    return {
      items: rows.map((row) => this.toView(row)),
      total,
      page,
      limit,
    };
  }

  async findOneById(id: number, scopedUserId?: number) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id, deletedAt: null, ...(scopedUserId ? { userId: scopedUserId } : {}) },
      include: STUDENT_INCLUDE,
    });
    if (!profile) {
      throw new NotFoundException(`Student with id '${id}' not found`);
    }
    return this.toView(profile);
  }

  async update(id: number, dto: UpdateStudentDto, actorId: number) {
    const before = await this.findOneById(id);

    if (
      dto.email !== undefined &&
      dto.email.trim().toLowerCase() !== before.user.email.toLowerCase()
    ) {
      const dup = await this.prisma.user.findFirst({
        where: {
          deletedAt: null,
          email: dto.email,
          id: { not: before.user.id },
        },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const userData: Prisma.UserUpdateInput = { updatedBy: actorId };
      if (dto.firstName !== undefined) userData.firstName = dto.firstName;
      if (dto.middleName !== undefined) userData.middleName = dto.middleName;
      if (dto.lastName !== undefined) userData.lastName = dto.lastName;
      if (
        dto.firstName !== undefined ||
        dto.middleName !== undefined ||
        dto.lastName !== undefined
      ) {
        const f = dto.firstName ?? before.user.firstName;
        const m = dto.middleName ?? before.user.middleName;
        const l = dto.lastName ?? before.user.lastName;
        userData.name =
          [f, m, l].filter(Boolean).join(' ').trim() || before.user.name;
      }
      if (dto.email !== undefined) userData.email = dto.email;
      if (dto.phone !== undefined) userData.phone = dto.phone;
      if (dto.gender !== undefined) userData.gender = dto.gender;
      if (dto.dateOfBirth !== undefined)
        userData.dateOfBirth = new Date(dto.dateOfBirth);
      if (dto.nationality !== undefined) userData.nationality = dto.nationality;
      if (dto.placeOfBirth !== undefined)
        userData.placeOfBirth = dto.placeOfBirth;
      if (dto.religion !== undefined) userData.religion = dto.religion;
      if (dto.county !== undefined) userData.county = dto.county;
      if (dto.address !== undefined) userData.address = dto.address;
      if (dto.city !== undefined) userData.city = dto.city;
      if (dto.postalCode !== undefined) userData.postalCode = dto.postalCode;
      if (dto.alternativePhoneNumber !== undefined)
        userData.alternativePhoneNumber = dto.alternativePhoneNumber;
      if (dto.isPwd !== undefined) userData.isPwd = dto.isPwd;
      if (dto.disabilityType !== undefined)
        userData.disabilityType = dto.disabilityType;
      if (dto.disabilityDescription !== undefined)
        userData.disabilityDescription = dto.disabilityDescription;
      await tx.user.update({ where: { id: before.user.id }, data: userData });

      await tx.studentProfile.update({
        where: { id },
        data: {
          nationalId: dto.nationalId,
          level: dto.level,
          admDate: dto.admDate ? new Date(dto.admDate) : undefined,
          status: dto.status,
          nextOfKinFirstName: dto.nextOfKinFirstName,
          nextOfKinLastName: dto.nextOfKinLastName,
          nextOfKinPhone: dto.nextOfKinPhone,
          nextOfKinAltPhone: dto.nextOfKinAltPhone,
          nextOfKinEmail: dto.nextOfKinEmail,
          nextOfKinRelationship: dto.nextOfKinRelationship,
          updatedBy: actorId,
        },
      });
    });

    await this.audit.log('student.update', actorId, 'Student', id, {
      oldValues: {
        admissionNumber: before.admissionNumber,
        status: before.status,
      },
      newValues: { status: dto.status, level: dto.level },
    });

    return this.findOneById(id);
  }

  /** Soft delete the profile + its enrolments and deactivate the linked user. */
  async remove(id: number, actorId: number): Promise<void> {
    const profile = await this.findOneById(id);

    await this.prisma.$transaction([
      this.prisma.studentProfile.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: actorId },
      }),
      this.prisma.courseEnrolment.updateMany({
        where: { studentId: id, deletedAt: null },
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

  /** Preview the next sequential admission number for a course. */
  async nextAdmissionNumber(courseId: number) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: { id: true, name: true, initials: true, code: true },
    });
    if (!course) {
      throw new NotFoundException(`Course '${courseId}' not found`);
    }
    return {
      courseId,
      courseName: course.name,
      nextAdmissionNumber: await this.buildAdmissionNumber(
        this.prisma,
        courseId,
      ),
    };
  }

  /** Printable admission-letter payload. */
  async admissionLetter(id: number, scopedUserId?: number) {
    const profile = await this.findOneById(id, scopedUserId);
    const u = profile.user;
    const enrolment = profile.activeEnrolment;

    return {
      referenceNumber: profile.admissionNumber,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      studentName: u.name,
      firstName: u.firstName,
      middleName: u.middleName,
      lastName: u.lastName,
      admissionNumber: profile.admissionNumber,
      nationalId: profile.nationalId,
      gender: u.gender,
      dateOfBirth: u.dateOfBirth,
      nationality: u.nationality,
      placeOfBirth: u.placeOfBirth,
      religion: u.religion,
      phone: u.phone,
      email: u.email,
      address: u.address,
      city: u.city,
      county: u.county,
      postalCode: u.postalCode,
      courseName: enrolment?.courseName ?? null,
      courseCode: enrolment?.courseCode ?? null,
      courseInitials: enrolment?.courseInitials ?? null,
      departmentName: enrolment?.departmentName ?? null,
      certificationAuthorityName: enrolment?.authorityName ?? null,
      certificationLevelName: enrolment?.levelName ?? null,
      curriculumName: enrolment?.curriculumName ?? null,
      academicSessionName: enrolment?.academicSessionName ?? null,
      academicYearName: enrolment?.academicYearName ?? null,
      admissionDate: profile.admDate,
      enrolmentStatus: enrolment?.status ?? null,
      loginId: u.username,
      defaultPassword: u.phone,
      mustResetPassword: u.mustResetPassword,
      institutionName: process.env.APP_NAME ?? 'Apex ERP',
    };
  }

  /** Flat CSV export (UTF-8 BOM so Excel opens it correctly). */
  async exportCsv(filters: StudentFilters = {}): Promise<string> {
    const where = this.buildWhere(filters);
    const rows = await this.prisma.studentProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
      include: STUDENT_INCLUDE,
    });

    const header = [
      'Admission Number',
      'First Name',
      'Middle Name',
      'Last Name',
      'Gender',
      'Date of Birth',
      'Nationality',
      'National ID',
      'Phone',
      'Alternative Phone',
      'Email',
      'County',
      'City',
      'Course',
      'Curriculum',
      'Certification Level',
      'Level',
      'Status',
      'Admission Date',
      'PWD',
    ];

    const esc = (value: string | number | boolean | null | undefined) => {
      if (value == null) return '""';
      return `"${String(value).replace(/"/g, '""')}"`;
    };

    const lines = rows.map((row) => {
      const it = this.toView(row);
      return [
        it.admissionNumber,
        it.user.firstName,
        it.user.middleName,
        it.user.lastName,
        it.user.gender,
        this.formatDate(it.user.dateOfBirth),
        it.user.nationality,
        it.nationalId,
        it.user.phone,
        it.user.alternativePhoneNumber,
        it.user.email,
        it.user.county,
        it.user.city,
        it.activeEnrolment?.courseName,
        it.activeEnrolment?.curriculumName,
        it.activeEnrolment?.levelName,
        it.level,
        it.status,
        this.formatDate(it.admDate),
        it.user.isPwd ? 'Yes' : 'No',
      ]
        .map(esc)
        .join(',');
    });

    return `\uFEFF${[header.map(esc).join(','), ...lines].join('\r\n')}`;
  }

  private buildWhere(filters: StudentFilters): Prisma.StudentProfileWhereInput {
    const where: Prisma.StudentProfileWhereInput = { deletedAt: null };

    if (filters.search) {
      where.OR = [
        { admissionNumber: { contains: filters.search, mode: 'insensitive' } },
        { nationalId: { contains: filters.search, mode: 'insensitive' } },
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { user: { phone: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.level) where.level = filters.level;
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.curriculumId) {
      where.courseEnrolments = {
        some: { deletedAt: null, courseCurriculumId: filters.curriculumId },
      };
    }

    return where;
  }

  private toView(
    row: Prisma.StudentProfileGetPayload<{ include: typeof STUDENT_INCLUDE }>,
  ) {
    const u = row.user;
    const enrolment = row.courseEnrolments[0] ?? null;
    const cc = enrolment?.courseCurriculum;
    const course = cc?.course;
    const session = enrolment?.academicSession;

    return {
      id: row.id,
      admissionNumber: row.admissionNumber,
      nationalId: row.nationalId,
      courseId: row.courseId,
      level: row.level,
      admDate: row.admDate,
      status: row.status,
      nextOfKinFirstName: row.nextOfKinFirstName,
      nextOfKinLastName: row.nextOfKinLastName,
      nextOfKinPhone: row.nextOfKinPhone,
      nextOfKinAltPhone: row.nextOfKinAltPhone,
      nextOfKinEmail: row.nextOfKinEmail,
      nextOfKinRelationship: row.nextOfKinRelationship,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        phone: u.phone,
        name: u.name,
        firstName: u.firstName,
        middleName: u.middleName,
        lastName: u.lastName,
        gender: u.gender,
        dateOfBirth: u.dateOfBirth,
        nationality: u.nationality,
        placeOfBirth: u.placeOfBirth,
        religion: u.religion,
        county: u.county,
        alternativePhoneNumber: u.alternativePhoneNumber,
        address: u.address,
        city: u.city,
        postalCode: u.postalCode,
        isPwd: u.isPwd,
        disabilityType: u.disabilityType,
        disabilityDescription: u.disabilityDescription,
        mustResetPassword: u.mustResetPassword,
        status: u.status,
        role: u.role,
      },
      activeEnrolment: enrolment
        ? {
            id: enrolment.id,
            courseCurriculumId: cc.id,
            courseId: course?.id ?? null,
            courseName: course?.name ?? null,
            courseCode: course?.code ?? null,
            courseInitials: course?.initials ?? null,
            departmentName: course?.department?.name ?? null,
            authorityName: course?.authority?.name ?? null,
            certificationAuthorityId: course?.authority?.id ?? null,
            levelName: course?.level?.name ?? null,
            certificationLevelId: course?.level?.id ?? null,
            curriculumId: cc.curriculum?.id ?? null,
            curriculumName: cc.curriculum?.cycleName ?? null,
            academicSessionId: session?.id ?? null,
            academicSessionName: session?.name ?? null,
            academicYearId: enrolment.academicYearId,
            academicYearName:
              enrolment.academicYear?.name ?? session?.year?.name ?? null,
            enrolmentDate: enrolment.enrolmentDate,
            status: enrolment.status,
            remarks: enrolment.remarks,
          }
        : null,
    };
  }

  private async buildAdmissionNumber(
    db: Prisma.TransactionClient | PrismaService,
    courseId: number,
  ): Promise<string> {
    const course = await db.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: { initials: true, code: true },
    });
    if (!course) {
      throw new NotFoundException(`Course '${courseId}' not found`);
    }

    const initials =
      (course.initials || course.code || 'STU')
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 20) || 'STU';

    const activeYear = await db.academicYear.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
      select: { startDate: true },
    });
    const intakeYear = (activeYear?.startDate ?? new Date())
      .getFullYear()
      .toString()
      .slice(-2);

    const count = await db.courseEnrolment.count({
      // Count every enrolment ever issued for the course so numbers are never
      // reused, even after a student is soft-deleted (their username stays).
      where: { courseCurriculum: { courseId } },
    });

    return `${initials}/${String(count + 1).padStart(4, '0')}/${intakeYear}`;
  }

  /** Resolve a role's name from its id (used for self-service scoping). */
  async resolveRoleName(roleId: number | null): Promise<string | null> {
    if (roleId == null) return null;
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true },
    });
    return role?.name ?? null;
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

  private formatDate(value: unknown): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return (value as string).slice(0, 10);
  }
}
