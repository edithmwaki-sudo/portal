/**
 * Idempotent seed script.
 *
 * Ensures a minimal bootstrap for a fresh database:
 *  1. permission catalog is synced from `SEED_PERMISSIONS`
 *  2. an `administrator` role exists
 *  3. the `administrator` role holds EVERY permission by default
 *  4. an admin user exists and is bound to the `administrator` role
 *
 * Run: `npm run prisma:seed`
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { syncPermissions } from './sync-permissions';

const ADMIN_ROLE_NAME = 'administrator';
const ADMIN_ROLE_DISPLAY = 'Administrator';

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@apex.local';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'System Administrator';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

async function main() {
  // Never allow the well-known default password in a production database.
  // Refuse to run unless SEED_ADMIN_PASSWORD is explicitly set.
  if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === 'admin123') {
    throw new Error(
      'Refusing to seed production with the default admin password. Set SEED_ADMIN_PASSWORD.',
    );
  }

  const prisma = new PrismaClient();
  try {
    console.log('Seeding permission catalog...');
    await syncPermissions(prisma);
    const permissions = await prisma.permission.findMany({
      select: { id: true },
    });
    console.log(`  -> ${permissions.length} permissions ready`);

    console.log(`Ensuring '${ADMIN_ROLE_NAME}' role...`);
    const adminRole = await prisma.role.upsert({
      where: { name: ADMIN_ROLE_NAME },
      update: { displayName: ADMIN_ROLE_DISPLAY },
      create: { name: ADMIN_ROLE_NAME, displayName: ADMIN_ROLE_DISPLAY },
    });

    // Admin role owns every permission by default.
    const existing = await prisma.rolePermission.findMany({
      where: { roleId: adminRole.id },
      select: { permissionId: true },
    });
    const have = new Set(existing.map((r) => r.permissionId));
    const toAdd = permissions
      .filter((pp) => !have.has(pp.id))
      .map((pp) => ({ roleId: adminRole.id, permissionId: pp.id }));
    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: toAdd,
        skipDuplicates: true,
      });
      console.log(
        `  -> granted ${toAdd.length} missing permission(s) to 'administrator'`,
      );
    } else {
      console.log('  -> administrator already holds every permission');
    }

    console.log('Ensuring HOD role has calendar & classes permissions...');
    const hodRole = await prisma.role.findUnique({
      where: { name: 'hod' },
      select: { id: true },
    });
    if (hodRole) {
      const hodPermissions = [
        'academic_year.view',
        'academic_session.view',
        'calendar.view',
        'calendar.add',
        'calendar.edit',
        'calendar.delete',
        'room.view',
        'room.add',
        'room.edit',
        'timetable.view',
        'timetable.my',
        'attendance.view',
        'attendance.mark',
      ];
      const permRows = await prisma.permission.findMany({
        where: { name: { in: hodPermissions } },
        select: { id: true, name: true },
      });
      const have = new Set(
        (
          await prisma.rolePermission.findMany({
            where: { roleId: hodRole.id },
            select: { permissionId: true },
          })
        ).map((r) => r.permissionId),
      );
      const toAdd = permRows
        .filter((p) => !have.has(p.id))
        .map((p) => ({ roleId: hodRole.id, permissionId: p.id }));
      if (toAdd.length > 0) {
        await prisma.rolePermission.createMany({
          data: toAdd,
          skipDuplicates: true,
        });
        console.log(
          `  -> granted ${toAdd.length} calendar & classes permission(s) to 'hod'`,
        );
      }
    }

    console.log('Ensuring calendar event types...');
    const eventTypes = [
      { code: 'holiday', label: 'Public Holiday', colorHex: '#ef4444' },
      { code: 'weekend', label: 'Weekend', colorHex: '#94a3b8' },
      { code: 'custom', label: 'Custom', colorHex: '#3b82f6' },
      { code: 'exams', label: 'Exams', colorHex: '#8b5cf6' },
      { code: 'graduation', label: 'Graduation', colorHex: '#f59e0b' },
      { code: 'fee_collection', label: 'Fee Collection', colorHex: '#10b981' },
      { code: 'session_break', label: 'Session Break', colorHex: '#6366f1' },
      { code: 'others', label: 'Others', colorHex: '#64748b' },
    ];
    for (const et of eventTypes) {
      await prisma.calendarEventType.upsert({
        where: { code: et.code },
        update: { label: et.label, colorHex: et.colorHex },
        create: { code: et.code, label: et.label, colorHex: et.colorHex },
      });
    }
    console.log(`  -> ${eventTypes.length} event types ready`);

    console.log(`Ensuring '${ADMIN_USERNAME}' user...`);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { username: ADMIN_USERNAME },
      update: {
        name: ADMIN_NAME,
        password: passwordHash,
        roleId: adminRole.id,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
      },
      create: {
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: passwordHash,
        name: ADMIN_NAME,
        roleId: adminRole.id,
        status: 'ACTIVE',
      },
      select: { id: true, username: true, email: true, roleId: true },
    });

    console.log('Seed complete:');
    console.log('  user     :', user.username);
    console.log('  email    :', user.email);
    console.log('  role     :', ADMIN_ROLE_NAME, '(all permissions)');
    console.log(
      '  password :',
      ADMIN_PASSWORD.length ? 'set (from SEED_ADMIN_PASSWORD or default)' : '',
    );
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
